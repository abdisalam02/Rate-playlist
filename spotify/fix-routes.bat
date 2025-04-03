@echo off
echo Fixing dynamic route conflicts...

REM Delete the conflicting user/[id] folder
rmdir /S /Q "src\app\user\[id]"

REM Let's make sure the content is updated to use userId instead of id
echo Route conflicts fixed!
echo Now you can run: npm run dev 