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



app = FastAPI()



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)



scheduler = BackgroundScheduler()
scheduler.start()



log_dir = os.path.join(os.path.dirname(__file__), '..', 'logs')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, 'app.log')



logging.basicConfig(
    filename=log_file,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)



downloads_dir = os.path.join(os.path.dirname(__file__), '..', 'downloads')
processed_dir = os.path.join(os.path.dirname(__file__), '..', 'processed')
os.makedirs(downloads_dir, exist_ok=True)
os.makedirs(processed_dir, exist_ok=True)



settings_file = os.path.join(os.path.dirname(__file__), '..', 'settings.json')



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



def load_settings():
    if os.path.exists(settings_file):
        with open(settings_file, 'r') as f:
            return json.load(f)
    return {
        "download_path": "downloads",
        "processed_path": "processed",
        "scheduler_time": "18:45",
        "scheduler_enabled": False
    }



def save_settings_file(settings):
    with open(settings_file, 'w') as f:
        json.dump(settings, f, indent=2)



def get_download_url(date_obj, job_type):
    """Generate the correct URL based on job type - UPDATED for NEW NSE format"""
    
    if job_type == "NSE Bhavcopy":
        formatted_date = date_obj.strftime('%Y%m%d')
        url = f"https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_{formatted_date}_F_0000.csv.zip"
        
    elif job_type == "NSE Delivery":
        formatted_date = date_obj.strftime('%d%m%Y')
        url = f"https://archives.nseindia.com/products/content/sec_bhavdata_full_{formatted_date}.csv"
        
    elif job_type == "BSE Bhavcopy":
        formatted_date = date_obj.strftime('%d%m%y')
        url = f"https://www.bseindia.com/download/BhavCopy/Equity/EQ{formatted_date}_CSV.ZIP"
    
    else:
        raise ValueError(f"Unknown job type: {job_type}")
    
    return url



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
            logging.error(error_msg)
        else:
            error_msg = f"Failed to download {date_str}: {str(e)}"
            logging.error(error_msg)
        return False, error_msg
    except Exception as e:
        error_msg = f"Error downloading {date_str}: {str(e)}"
        logging.error(error_msg)
        return False, error_msg



def scheduled_task():
    """Task that runs on schedule with retry logic"""
    logging.info("Running scheduled download task")
    today = datetime.now().strftime('%Y-%m-%d')
    
    success, message = download_file(today, "NSE Bhavcopy")
    
    if not success and "File not found" in message:
        logging.warning("Data not available yet, scheduling retry in 30 minutes")
        retry_time = datetime.now() + timedelta(minutes=30)
        scheduler.add_job(
            retry_download_task,
            'date',
            run_date=retry_time,
            args=[today],
            id=f'retry_{today}',
            replace_existing=True
        )
    elif success:
        logging.info(f"Scheduled download successful: {message}")



def retry_download_task(date_str):
    """Retry task for failed downloads"""
    logging.info(f"Retrying download for {date_str}")
    success, message = download_file(date_str, "NSE Bhavcopy")
    if success:
        logging.info(f"Retry successful: {message}")
    else:
        logging.error(f"Retry failed: {message}")



# ===== EXCEL PROCESSING FUNCTIONS =====

def process_nse_bhavcopy(file_path):
    """Process NSE Bhavcopy CSV files"""
    try:
        logging.info(f"Processing NSE Bhavcopy: {file_path}")
        
        # Read CSV file
        df = pd.read_csv(file_path)
        
        logging.info(f"Read {len(df)} rows from NSE Bhavcopy")
        logging.info(f"Columns: {df.columns.tolist()}")
        
        # Handle both new and old NSE formats
        if 'TrdSymb' in df.columns:  # New format
            df_filtered = df[df['Series'] == 'EQ'].copy()
            
            df_processed = df_filtered[['TrdSymb', 'OpnPric', 'HghPric', 'LwPric', 'ClsPric', 'TtlTradgVol']].copy()
            df_processed.columns = ['Symbol', 'Open', 'High', 'Low', 'Close', 'Volume']
            
        elif 'SYMBOL' in df.columns:  # Old format
            df_filtered = df[df['SERIES'] == 'EQ'].copy()
            
            df_processed = df_filtered[['SYMBOL', 'OPEN', 'HIGH', 'LOW', 'CLOSE', 'TOTTRDQTY']].copy()
            df_processed.columns = ['Symbol', 'Open', 'High', 'Low', 'Close', 'Volume']
        else:
            raise ValueError(f"Unknown NSE Bhavcopy format. Columns found: {df.columns.tolist()}")
        
        # Sort by volume (highest first)
        df_processed = df_processed.sort_values('Volume', ascending=False)
        
        # Create output filename
        output_filename = f"NSE_Bhavcopy_Processed_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        output_path = os.path.join(processed_dir, output_filename)
        
        # Save to Excel with formatting
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            df_processed.to_excel(writer, sheet_name='Equity_Data', index=False)
        
        logging.info(f"Saved processed file: {output_path}")
        
        return {
            "status": "success",
            "output_file": output_filename,
            "rows_processed": len(df_processed),
            "message": f"Successfully processed {len(df_processed)} equity stocks"
        }
        
    except Exception as e:
        logging.error(f"NSE Bhavcopy processing error: {str(e)}")
        raise Exception(f"NSE Bhavcopy processing failed: {str(e)}")


def process_nse_delivery(file_path):
    """Process NSE Delivery data CSV files"""
    try:
        logging.info(f"Processing NSE Delivery: {file_path}")
        
        # Read CSV file
        df = pd.read_csv(file_path)
        
        logging.info(f"Read {len(df)} rows from NSE Delivery data")
        
        # Select relevant columns
        if 'SYMBOL' in df.columns and 'QTY_PER' in df.columns:
            df_processed = df[['SYMBOL', 'QTY_PER', 'DELIV_QTY', 'TRADED_QTY']].copy()
            df_processed.columns = ['Symbol', 'Delivery_%', 'Delivery_Qty', 'Traded_Qty']
            
            # Filter stocks with delivery % >= 50%
            df_processed = df_processed[df_processed['Delivery_%'] >= 50]
            
            # Sort by delivery percentage (highest first)
            df_processed = df_processed.sort_values('Delivery_%', ascending=False)
        else:
            raise ValueError(f"Unknown NSE Delivery format. Columns: {df.columns.tolist()}")
        
        # Create output filename
        output_filename = f"NSE_Delivery_Processed_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        output_path = os.path.join(processed_dir, output_filename)
        
        # Save to Excel
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            df_processed.to_excel(writer, sheet_name='High_Delivery', index=False)
        
        logging.info(f"Saved processed file: {output_path}")
        
        return {
            "status": "success",
            "output_file": output_filename,
            "rows_processed": len(df_processed),
            "message": f"Processed {len(df_processed)} stocks with delivery >= 50%"
        }
        
    except Exception as e:
        logging.error(f"NSE Delivery processing error: {str(e)}")
        raise Exception(f"NSE Delivery processing failed: {str(e)}")


def process_bse_bhavcopy(file_path):
    """Process BSE Bhavcopy CSV files"""
    try:
        logging.info(f"Processing BSE Bhavcopy: {file_path}")
        
        # BSE files might be ZIP, extract if needed
        if file_path.endswith('.ZIP') or file_path.endswith('.zip'):
            extract_dir = os.path.dirname(file_path)
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
            
            # Find the extracted CSV file
            csv_files = [f for f in os.listdir(extract_dir) if f.endswith('.CSV')]
            if csv_files:
                file_path = os.path.join(extract_dir, csv_files[0])
                logging.info(f"Extracted and processing: {csv_files[0]}")
        
        # Read CSV
        df = pd.read_csv(file_path)
        
        logging.info(f"Read {len(df)} rows from BSE Bhavcopy")
        
        # Select columns
        if 'SC_CODE' in df.columns:
            df_processed = df[['SC_CODE', 'SC_NAME', 'OPEN', 'HIGH', 'LOW', 'CLOSE', 'NO_OF_SHRS']].copy()
            df_processed.columns = ['Code', 'Name', 'Open', 'High', 'Low', 'Close', 'Volume']
            
            # Sort by volume
            df_processed = df_processed.sort_values('Volume', ascending=False)
        else:
            raise ValueError(f"Unknown BSE format. Columns: {df.columns.tolist()}")
        
        # Create output filename
        output_filename = f"BSE_Bhavcopy_Processed_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        output_path = os.path.join(processed_dir, output_filename)
        
        # Save to Excel
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            df_processed.to_excel(writer, sheet_name='BSE_Data', index=False)
        
        logging.info(f"Saved processed file: {output_path}")
        
        return {
            "status": "success",
            "output_file": output_filename,
            "rows_processed": len(df_processed),
            "message": f"Processed {len(df_processed)} BSE records"
        }
        
    except Exception as e:
        logging.error(f"BSE processing error: {str(e)}")
        raise Exception(f"BSE processing failed: {str(e)}")



# ===== API ENDPOINTS =====

@app.get("/")
async def root():
    return {
        "message": "HomeStock Python Backend Running",
        "status": "ok",
        "version": "0.3.0"
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
            if current_date.weekday() < 5:
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



@app.post("/api/process_excel")
async def process_excel(request: ProcessRequest):
    """Process downloaded CSV/Excel files and transform them"""
    try:
        file_path = request.file_path
        
        # If just filename is provided, make it absolute path
        if not os.path.isabs(file_path):
            file_path = os.path.join(downloads_dir, file_path)
        
        logging.info(f"Processing file: {file_path}")
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
        
        filename = os.path.basename(file_path)
        
        # Determine file type and process accordingly
        if 'BhavCopy_NSE' in filename or 'bhav' in filename.lower():
            result = process_nse_bhavcopy(file_path)
        elif 'sec_bhavdata' in filename:
            result = process_nse_delivery(file_path)
        elif 'EQ' in filename and 'CSV' in filename.upper():
            result = process_bse_bhavcopy(file_path)
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Unknown file format: {filename}. Supported: NSE Bhavcopy, NSE Delivery, BSE Bhavcopy"
            )
        
        logging.info(f"Processing complete: {result['output_file']}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/api/logs")
async def get_logs():
    try:
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                logs = f.readlines()
                return {"logs": logs[-100:]}
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
                warning_message = "Warning: NSE data is typically available after 6:30 PM IST"
                logging.warning(f"Scheduler time {settings_dict['scheduler_time']} may be too early for data availability")
        
        # Save the new settings
        save_settings_file(settings_dict)
        
        # Check if scheduler-related settings changed
        scheduler_changed = (
            old_settings.get('scheduler_time') != settings_dict['scheduler_time'] or
            old_settings.get('scheduler_enabled') != settings_dict['scheduler_enabled']
        )
        
        # If scheduler settings changed, restart it
        if scheduler_changed and settings_dict['scheduler_enabled']:
            try:
                scheduler.remove_job('daily_download')
                logging.info("Removed old scheduler job")
            except:
                pass
            
            # Add new job with updated time
            time_parts = settings_dict['scheduler_time'].split(':')
            hour = int(time_parts[0])
            minute = int(time_parts[1])
            
            scheduler.add_job(
                scheduled_task,
                'cron',
                hour=hour,
                minute=minute,
                id='daily_download',
                replace_existing=True
            )
            logging.info(f"Scheduler restarted with new time: {settings_dict['scheduler_time']}")
            
        elif scheduler_changed and not settings_dict['scheduler_enabled']:
            try:
                scheduler.remove_job('daily_download')
                logging.info("Scheduler disabled and job removed")
            except:
                pass
        
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
        settings = load_settings()
        time_parts = settings['scheduler_time'].split(':')
        hour = int(time_parts[0])
        minute = int(time_parts[1])
        
        scheduler.add_job(
            scheduled_task,
            'cron',
            hour=hour,
            minute=minute,
            id='daily_download',
            replace_existing=True
        )
        logging.info(f"Scheduler started for {settings['scheduler_time']}")
        return {"status": "success", "message": f"Scheduler started for {settings['scheduler_time']}"}
    except Exception as e:
        logging.error(f"Scheduler start error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/scheduler/stop")
async def stop_scheduler():
    try:
        scheduler.remove_job('daily_download')
        logging.info("Scheduler stopped")
        return {"status": "success", "message": "Scheduler stopped"}
    except Exception as e:
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
    print("HomeStock Python Backend")
    print("=" * 60)
    print("Starting on http://127.0.0.1:8000")
    print("Default scheduler time: 18:45 (6:45 PM IST)")
    print("NSE data is typically available after 6:30 PM IST")
    print("=" * 60)
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
