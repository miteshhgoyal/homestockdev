"""
Build script to create standalone Python executable
Run: python build_exe.py
"""

import PyInstaller.__main__
import os
import sys

def build_executable():
    # Get the directory where this script is located
    current_dir = os.path.dirname(os.path.abspath(__file__))
    main_script = os.path.join(current_dir, 'main.py')
    
    print(f"Building executable from: {main_script}")
    
    # PyInstaller arguments
    args = [
        main_script,                    # Main Python file
        '--onefile',                    # Single executable file
        '--name=main',                  # Output name
        '--distpath=dist',              # Output directory
        '--workpath=build',             # Build directory
        '--specpath=.',                 # Spec file location
        '--clean',                      # Clean cache
        '--noconfirm',                  # Don't ask for confirmation
        '--console',                    # Show console window (for debugging)
        
        # Hidden imports (dependencies that PyInstaller might miss)
        '--hidden-import=uvicorn',
        '--hidden-import=uvicorn.logging',
        '--hidden-import=uvicorn.loops',
        '--hidden-import=uvicorn.loops.auto',
        '--hidden-import=uvicorn.protocols',
        '--hidden-import=uvicorn.protocols.http',
        '--hidden-import=uvicorn.protocols.http.auto',
        '--hidden-import=uvicorn.protocols.websockets',
        '--hidden-import=uvicorn.protocols.websockets.auto',
        '--hidden-import=uvicorn.lifespan',
        '--hidden-import=uvicorn.lifespan.on',
        '--hidden-import=fastapi',
        '--hidden-import=pydantic',
        '--hidden-import=pydantic.dataclasses',
        '--hidden-import=pydantic_core',
        '--hidden-import=starlette',
        '--hidden-import=starlette.routing',
        '--hidden-import=openpyxl',
        '--hidden-import=openpyxl.styles',
        '--hidden-import=pandas',
        '--hidden-import=pandas._libs',
        '--hidden-import=apscheduler',
        '--hidden-import=apscheduler.schedulers.background',
        '--hidden-import=apscheduler.triggers.cron',
        '--hidden-import=requests',
        '--hidden-import=zipfile',
        '--hidden-import=shutil',
        
        # Collect all packages
        '--collect-all=uvicorn',
        '--collect-all=fastapi',
        '--collect-all=starlette',
        '--collect-all=pydantic',
        '--collect-all=pydantic_core',
    ]
    
    print("=" * 60)
    print("Starting PyInstaller build...")
    print("=" * 60)
    PyInstaller.__main__.run(args)
    print("=" * 60)
    print("Build complete! Executable created in dist/ folder")
    print("=" * 60)

if __name__ == '__main__':
    # Check if PyInstaller is installed
    try:
        import PyInstaller
    except ImportError:
        print("PyInstaller not found. Installing...")
        os.system(f"{sys.executable} -m pip install pyinstaller")
    
    build_executable()
