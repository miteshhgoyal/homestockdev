from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
import json
import os
from datetime import datetime, timedelta
import logging
from apscheduler.schedulers.background import BackgroundScheduler
import requests
from openpyxl import load_workbook, Workbook
from typing import Optional
import zipfile
import pandas as pd


# ===== FASTAPI APP INITIALIZATION =====
app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===== SCHEDULER INITIALIZATION =====
scheduler = BackgroundScheduler()
scheduler.start()


# ===== LOGGING SETUP =====
log_dir = os.path.join(os.path.dirname(__file__), '..', 'logs')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, 'app.log')


logging.basicConfig(
    filename=log_file,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)


# ===== DIRECTORY SETUP =====
downloads_dir = os.path.join(os.path.dirname(__file__), '..', 'downloads')
processed_dir = os.path.join(os.path.dirname(__file__), '..', 'processed')
os.makedirs(downloads_dir, exist_ok=True)
os.makedirs(processed_dir, exist_ok=True)


settings_file = os.path.join(os.path.dirname(__file__), '..', 'settings.json')


# ===== PYDANTIC MODELS =====
class DownloadRequest(BaseModel):
    date_from: str
    date_to: str
    job_type: str
    custom_url: Optional[str] = None


class ProcessRequest(BaseModel):
    file_path: str


class SettingsModel(BaseModel):
    download_path: str
    processed_path: str
    scheduler_time: str
    scheduler_enabled: bool
    scheduler_manual_date: Optional[str] = None


# ===== SETTINGS FUNCTIONS =====
def load_settings():
    if os.path.exists(settings_file):
        with open(settings_file, 'r') as f:
            return json.load(f)
    return {
        "download_path": "downloads",
        "processed_path": "processed",
        "scheduler_time": "18:45",
        "scheduler_enabled": False,
        "scheduler_manual_date": None
    }


def save_settings_file(settings):
    with open(settings_file, 'w') as f:
        json.dump(settings, f, indent=2)


# ===== DOWNLOAD URL GENERATOR (FIXED URLS) =====
def get_download_url(date_obj, job_type):
    """Generate the correct URL based on job type - FIXED December 2025"""
    
    if job_type == "NSE Bhavcopy":
        # WORKING FORMAT (Confirmed Dec 2025)
        # Format: PR[DDMMYY].zip
        # Example: Dec 19, 2025 → PR191225.zip
        formatted_date = date_obj.strftime('%d%m%y')
        url = f"https://nsearchives.nseindia.com/archives/equities/bhavcopy/pr/PR{formatted_date}.zip"
        
    elif job_type == "NSE Delivery":
        formatted_date = date_obj.strftime('%d%m%Y')
        url = f"https://archives.nseindia.com/products/content/sec_bhavdata_full_{formatted_date}.csv"
        
    elif job_type == "BSE Bhavcopy":
        formatted_date = date_obj.strftime('%d%m%y')
        url = f"https://www.bseindia.com/download/BhavCopy/Equity/EQ{formatted_date}_CSV.ZIP"
    
    else:
        raise ValueError(f"Unknown job type: {job_type}")
    
    return url


# ===== FILE DOWNLOAD FUNCTION (WITH RETRY LOGIC) =====
def download_file(date_str, job_type):
    """Download file for a specific date and job type"""
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        url = get_download_url(date_obj, job_type)
        
        logging.info(f"Downloading from: {url}")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        }
        
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        filename = url.split('/')[-1]
        file_path = os.path.join(downloads_dir, filename)
        
        with open(file_path, 'wb') as f:
            f.write(response.content)
        
        # Extract if ZIP
        if filename.endswith('.zip') or filename.endswith('.ZIP'):
            try:
                with zipfile.ZipFile(file_path, 'r') as zip_ref:
                    zip_ref.extractall(downloads_dir)
                logging.info(f"Extracted: {filename}")
            except zipfile.BadZipFile:
                logging.warning(f"Could not extract {filename}, keeping as is")
        
        logging.info(f"Successfully downloaded: {filename}")
        return True, f"Downloaded: {filename}"
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            error_msg = f"File not found for {date_str} (likely holiday/weekend or data not available yet)"
            logging.warning(error_msg)
        else:
            error_msg = f"HTTP Error {e.response.status_code} for {date_str}: {str(e)}"
            logging.error(error_msg)
        return False, error_msg
    except Exception as e:
        error_msg = f"Error downloading {date_str}: {str(e)}"
        logging.error(error_msg)
        return False, error_msg


# ===== SCHEDULED TASK FUNCTIONS =====
def scheduled_download_task():
    """Task that runs on schedule - downloads NSE Bhavcopy for configured date"""
    try:
        logging.info("🔔 Running scheduled download task")
        
        # Load settings to check if manual date is set
        settings = load_settings()
        manual_date = settings.get('scheduler_manual_date', None)
        
        if manual_date:
            # Use manual date for testing
            logging.info(f"Using manual date for testing: {manual_date}")
            download_date = datetime.strptime(manual_date, '%Y-%m-%d')
        else:
            # Use today's date (production behavior)
            download_date = datetime.now()
            
            # Skip weekends
            if download_date.weekday() >= 5:
                logging.info("Skipping scheduled download - weekend")
                return
        
        date_str = download_date.strftime('%Y-%m-%d')
        logging.info(f"Downloading data for: {date_str}")
        
        success, message = download_file(date_str, "NSE Bhavcopy")
        
        if not success and "File not found" in message:
            logging.warning("Data not available yet, will retry in next scheduled run")
        elif success:
            logging.info(f"Scheduled download successful: {message}")
        else:
            logging.error(f"Scheduled download failed: {message}")
            
    except Exception as e:
        logging.error(f"Scheduled task error: {str(e)}")


def reload_scheduler_from_settings():
    """Load scheduler config from settings and start if enabled"""
    try:
        settings = load_settings()
        if settings.get('scheduler_enabled', False):
            scheduler_time = settings.get('scheduler_time', '18:45')
            hour, minute = map(int, scheduler_time.split(':'))
            
            # Remove existing job if any
            try:
                scheduler.remove_job('daily_download')
                logging.info("Removed existing scheduler job")
            except:
                pass
            
            # Add new job
            scheduler.add_job(
                scheduled_download_task,
                trigger='cron',
                hour=hour,
                minute=minute,
                id='daily_download',
                replace_existing=True
            )
            logging.info(f"📅 Scheduler loaded: Daily job at {scheduler_time}")
        else:
            logging.info("Scheduler disabled in settings")
    except Exception as e:
        logging.error(f"Failed to reload scheduler: {str(e)}")


# Load scheduler on startup
reload_scheduler_from_settings()


# ===== EXCEL PROCESSING FUNCTIONS =====

@app.post("/api/process_excel")
async def process_excel(request: ProcessRequest):
    """UNIVERSAL PROCESSOR - Handles ALL file types"""
    try:
        file_path = request.file_path
        
        # If just filename is provided, make it absolute path
        if not os.path.isabs(file_path):
            file_path = os.path.join(downloads_dir, file_path)
        
        logging.info(f"📄 Processing file: {file_path}")
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
        
        filename = os.path.basename(file_path)
        
        # UNIVERSAL FILE READER
        try:
            # Try to read as CSV first (most NSE files are CSV or no extension)
            if file_path.endswith('.csv') or not '.' in filename or filename.endswith(tuple('0123456789')):
                # Many NSE files have no extension or end with date
                df = pd.read_csv(file_path)
                
            elif file_path.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file_path)
                
            elif file_path.endswith(('.zip', '.ZIP')):
                # Extract and process
                extract_dir = os.path.dirname(file_path)
                with zipfile.ZipFile(file_path, 'r') as zip_ref:
                    zip_ref.extractall(extract_dir)
                
                # Find CSV files (look for pd*, pr*, or .csv files)
                csv_files = [f for f in os.listdir(extract_dir) 
                           if f.endswith('.csv') or f.startswith('pd') or f.startswith('pr')]
                
                if csv_files:
                    # Process the first CSV found (usually pd* is primary data)
                    csv_path = os.path.join(extract_dir, csv_files[0])
                    df = pd.read_csv(csv_path)
                    logging.info(f"Extracted and processing: {csv_files[0]}")
                else:
                    raise ValueError("No CSV files found in ZIP")
            else:
                raise ValueError(f"Unsupported file format: {filename}")
            
            logging.info(f"Successfully read {len(df)} rows, {len(df.columns)} columns")
            logging.info(f"📊 Columns: {df.columns.tolist()[:10]}...")  # Show first 10 columns
            
            # Create output filename based on input
            base_name = filename.replace('.zip', '').replace('.csv', '').replace('.xlsx', '').replace('.CSV', '')
            output_filename = f"Processed_{base_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            output_path = os.path.join(processed_dir, output_filename)
            
            # Save to Excel
            with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Data', index=False)
            
            logging.info(f"💾 Saved processed file: {output_path}")
            
            return {
                "status": "success",
                "output_file": output_filename,
                "rows_processed": len(df),
                "columns": len(df.columns),
                "message": f"Successfully processed {len(df)} rows with {len(df.columns)} columns"
            }
            
        except pd.errors.EmptyDataError:
            raise HTTPException(status_code=400, detail="File is empty or has no data")
        except pd.errors.ParserError as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== API ENDPOINTS =====
@app.get("/")
async def root():
    return {
        "message": "HomeStock Python Backend Running",
        "status": "ok",
        "version": "2.0.0 - Universal Processor"
    }


@app.post("/api/start_download")
async def start_download(request: DownloadRequest):
    try:
        logging.info(f"Starting download: {request.job_type} from {request.date_from} to {request.date_to}")
        
        start_date = datetime.strptime(request.date_from, '%Y-%m-%d')
        end_date = datetime.strptime(request.date_to, '%Y-%m-%d')
        
        success_count = 0
        failed_count = 0
        results = []
        
        current_date = start_date
        while current_date <= end_date:
            if current_date.weekday() < 5:  # Skip weekends
                success, message = download_file(current_date.strftime('%Y-%m-%d'), request.job_type)
                if success:
                    success_count += 1
                else:
                    failed_count += 1
                results.append(message)
            else:
                results.append(f"Skipped {current_date.strftime('%Y-%m-%d')} (weekend)")
            
            current_date += timedelta(days=1)
        
        return {
            "status": "success",
            "message": f"Download completed: {success_count} successful, {failed_count} failed",
            "files_downloaded": success_count,
            "details": results
        }
    except Exception as e:
        logging.error(f"Download error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/logs")
async def get_logs():
    try:
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                logs = f.readlines()
                return {"logs": logs[-100:]}  # Return last 100 lines
        return {"logs": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/settings")
async def get_settings():
    return load_settings()


@app.post("/api/settings")
async def save_settings(settings: SettingsModel):
    try:
        settings_dict = settings.dict()
        old_settings = load_settings()
        
        # Validate scheduler time
        warning_message = None
        if settings_dict['scheduler_enabled']:
            time_parts = settings_dict['scheduler_time'].split(':')
            hour = int(time_parts[0])
            minute = int(time_parts[1])
            
            # Warn if time is before 6:30 PM
            if hour < 18 or (hour == 18 and minute < 30):
                warning_message = "⚠️ Warning: NSE data is typically available after 6:30 PM IST"
                logging.warning(f"Scheduler time {settings_dict['scheduler_time']} may be too early for data availability")
        
        # Save the new settings
        save_settings_file(settings_dict)
        
        # Check if scheduler-related settings changed
        scheduler_changed = (
            old_settings.get('scheduler_time') != settings_dict['scheduler_time'] or
            old_settings.get('scheduler_enabled') != settings_dict['scheduler_enabled']
        )
        
        # If scheduler settings changed, reload it
        if scheduler_changed:
            reload_scheduler_from_settings()
        
        logging.info("Settings saved successfully")
        
        response_data = {
            "status": "success",
            "message": "Settings saved and scheduler updated",
            "scheduler_restarted": scheduler_changed
        }
        
        if warning_message:
            response_data['warning'] = warning_message
            
        return response_data
        
    except Exception as e:
        logging.error(f"Settings save error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/scheduler/start")
async def start_scheduler():
    try:
        reload_scheduler_from_settings()
        return {"status": "success", "message": "Scheduler started"}
    except Exception as e:
        logging.error(f"Scheduler start error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/scheduler/stop")
async def stop_scheduler():
    try:
        scheduler.remove_job('daily_download')
        logging.info("Scheduler stopped")
        return {"status": "success", "message": "Scheduler stopped"}
    except:
        return {"status": "error", "message": "No active scheduler"}


@app.get("/api/scheduler/status")
async def scheduler_status():
    """Get current scheduler status and next run time"""
    try:
        jobs = scheduler.get_jobs()
        daily_job = None
        
        for job in jobs:
            if job.id == 'daily_download':
                daily_job = job
                break
        
        if daily_job:
            return {
                "status": "running",
                "next_run": str(daily_job.next_run_time),
                "job_id": daily_job.id
            }
        else:
            return {
                "status": "stopped",
                "next_run": None,
                "job_id": None
            }
    except Exception as e:
        logging.error(f"Scheduler status error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== FILE MANAGEMENT ENDPOINTS =====
@app.get("/api/files/downloaded")
async def get_downloaded_files():
    """Get list of downloaded files with metadata"""
    try:
        files = []
        if not os.path.exists(downloads_dir):
            return {"files": []}
            
        for filename in os.listdir(downloads_dir):
            file_path = os.path.join(downloads_dir, filename)
            if os.path.isfile(file_path):
                stat = os.stat(file_path)
                files.append({
                    "name": filename,
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
        
        # Sort by modified date (newest first)
        files.sort(key=lambda x: x['modified'], reverse=True)
        logging.info(f"Retrieved {len(files)} downloaded files")
        return {"files": files}
    except Exception as e:
        logging.error(f"Error getting downloaded files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/files/processed")
async def get_processed_files():
    """Get list of processed files with metadata"""
    try:
        files = []
        if not os.path.exists(processed_dir):
            return {"files": []}
            
        for filename in os.listdir(processed_dir):
            file_path = os.path.join(processed_dir, filename)
            if os.path.isfile(file_path):
                stat = os.stat(file_path)
                files.append({
                    "name": filename,
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
        
        # Sort by modified date (newest first)
        files.sort(key=lambda x: x['modified'], reverse=True)
        logging.info(f"Retrieved {len(files)} processed files")
        return {"files": files}
    except Exception as e:
        logging.error(f"Error getting processed files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/files/download/{file_type}/{filename}")
async def download_file_endpoint(file_type: str, filename: str):
    """Download a specific file from server"""
    try:
        # Validate file type
        if file_type == "downloaded":
            base_dir = downloads_dir
        elif file_type == "processed":
            base_dir = processed_dir
        else:
            raise HTTPException(status_code=400, detail="Invalid file type. Use 'downloaded' or 'processed'")
        
        # Security: Prevent directory traversal
        file_path = os.path.join(base_dir, filename)
        if not file_path.startswith(base_dir):
            raise HTTPException(status_code=400, detail="Invalid file path")
        
        # Check if file exists
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {filename}")
        
        # Check if it's a file (not directory)
        if not os.path.isfile(file_path):
            raise HTTPException(status_code=400, detail="Not a valid file")
        
        logging.info(f"Downloading file: {filename} from {file_type}")
        
        # Return file
        return FileResponse(
            path=file_path,
            media_type='application/octet-stream',
            filename=filename,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"File download error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/files/{file_type}/{filename}")
async def delete_file_endpoint(file_type: str, filename: str):
    """Delete a specific file from server"""
    try:
        # Validate file type
        if file_type == "downloaded":
            base_dir = downloads_dir
        elif file_type == "processed":
            base_dir = processed_dir
        else:
            raise HTTPException(status_code=400, detail="Invalid file type. Use 'downloaded' or 'processed'")
        
        # Security: Prevent directory traversal
        file_path = os.path.join(base_dir, filename)
        if not file_path.startswith(base_dir):
            raise HTTPException(status_code=400, detail="Invalid file path")
        
        # Check if file exists
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {filename}")
        
        # Check if it's a file (not directory)
        if not os.path.isfile(file_path):
            raise HTTPException(status_code=400, detail="Not a valid file")
        
        # Delete the file
        os.remove(file_path)
        logging.info(f"Deleted file: {filename} from {file_type} directory")
        
        return {
            "status": "success",
            "message": f"File '{filename}' deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"File deletion error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/files/stats")
async def get_files_stats():
    """Get statistics about files"""
    try:
        downloaded_count = 0
        downloaded_size = 0
        processed_count = 0
        processed_size = 0
        
        # Count downloaded files
        if os.path.exists(downloads_dir):
            for filename in os.listdir(downloads_dir):
                file_path = os.path.join(downloads_dir, filename)
                if os.path.isfile(file_path):
                    downloaded_count += 1
                    downloaded_size += os.path.getsize(file_path)
        
        # Count processed files
        if os.path.exists(processed_dir):
            for filename in os.listdir(processed_dir):
                file_path = os.path.join(processed_dir, filename)
                if os.path.isfile(file_path):
                    processed_count += 1
                    processed_size += os.path.getsize(file_path)
        
        return {
            "downloaded": {
                "count": downloaded_count,
                "total_size": downloaded_size
            },
            "processed": {
                "count": processed_count,
                "total_size": processed_size
            }
        }
    except Exception as e:
        logging.error(f"Error getting file stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    print("=" * 60)
    print("HomeStock Python Backend v2.0")
    print("=" * 60)
    print("Universal File Processor Enabled")
    print("NSE Bhavcopy URL Fixed (Dec 2025)")
    print("Scheduler Ready")
    print("=" * 60)
    print("Server: http://127.0.0.1:8000")
    print("Port: 8000")
    print("=" * 60)
    
    try:
        uvicorn.run(
            app,
            host="127.0.0.1",
            port=8000,
            log_level="info"
        )
    except Exception as e:
        print(f"Error starting server: {e}")
    
    print("=" * 60)
    print("🛑 Server shutdown")
    print("=" * 60)
