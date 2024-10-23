@echo off
call env.bat
@echo Levantando server waitress...
waitress-serve --listen=0.0.0.0:8081 app:app
