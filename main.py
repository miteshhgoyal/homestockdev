import os


def should_skip_directory(dir_name):
    """Check if directory should be skipped"""
    skip_dirs = {
        '.expo', 'node_modules', '.git', '__pycache__', 
        '.vscode', '.idea', 'dist', 'build', '.next',
        'coverage', '.nyc_output', 'logs', 'temp', 'tmp'
    }
    return dir_name in skip_dirs or dir_name.startswith('.')


def find_and_extract_files(target_files, root_dir='.', output_file='files-content.txt', search_folders=None):
    """
    Search for specified files and extract their content to files-content.txt
    
    Args:
        target_files: List of file names to search for
        root_dir: Root directory to start search from
        output_file: Output file to write results
        search_folders: List of specific folder names to search in (e.g., ['user-frontend', 'backend'])
                       If None, searches all folders
    """
    
    with open(output_file, 'w', encoding='utf-8') as out_file:
        # If specific folders are provided, only search in those
        if search_folders:
            search_paths = [os.path.join(root_dir, folder) for folder in search_folders]
        else:
            # Search all folders in root_dir
            search_paths = [root_dir]
        
        for search_path in search_paths:
            # Check if the search path exists
            if not os.path.exists(search_path):
                print(f"Warning: Path '{search_path}' does not exist. Skipping...")
                continue
            
            print(f"Searching in: {search_path}")
            
            for root, dirs, files in os.walk(search_path):
                # Remove directories to skip from dirs list (modifies os.walk behavior)
                dirs[:] = [d for d in dirs if not should_skip_directory(d)]
                
                for file in files:
                    if file in target_files:
                        file_path = os.path.join(root, file)
                        try:
                            # Write file path
                            out_file.write(f"{'='*60}\n")
                            out_file.write(f"FILE: {file_path}\n")
                            out_file.write(f"{'='*60}\n\n")
                            
                            # Read and write file content
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                                out_file.write(content)
                                out_file.write('\n\n')
                            
                            print(f"Processed: {file_path}")
                            
                        except Exception as e:
                            out_file.write(f"ERROR reading file: {str(e)}\n\n")
                            print(f"Error processing {file_path}: {str(e)}")


# Usage example
if __name__ == "__main__":
    # Define the files you want to search for
    files_to_find = [
        'main.js',
        'app.log',
        'index.html',
        'build_exe.py',
        'main.py',
        'Sidebar.js',
        'Downloads.js',
        'Dashboard.js',
        'Settings.js',
        'Logs.js',
        'api.js',
        'App.jsx',
        'package.json',
        'webpack.config.js',
        'documentation.md',
        'README.md',
    ]
    
    # Option 1: Search only in 'user-frontend' and 'backend' folders
    folders_to_search = ['backend']
    # find_and_extract_files(files_to_find, search_folders=folders_to_search)
    find_and_extract_files(files_to_find)
    
    # Option 2: Search in all folders (pass None or omit search_folders parameter)
    # find_and_extract_files(files_to_find)
    
    # Option 3: Search in a single folder
    # find_and_extract_files(files_to_find, search_folders=['user-frontend'])
    
    print("File extraction completed. Check files-content.txt for results.")
