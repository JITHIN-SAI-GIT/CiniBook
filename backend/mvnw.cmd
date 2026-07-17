@REM ----------------------------------------------------------------------------
@REM  Maven Wrapper startup batch script for CineBook
@REM  Downloads Maven automatically on first run
@REM ----------------------------------------------------------------------------

@IF "%__MVNW_ARG0_NAME__%"=="" (SET "__MVNW_ARG0_NAME__=%~nx0")

@SET @@FAIL_FAST=
@SET JAVA_HOME=C:\Program Files\Java\jdk-17
@SETLOCAL
@SET MAVEN_WRAPPER_PROPERTIES_FILE="%~dp0.mvn\wrapper\maven-wrapper.properties"

SET DOWNLOAD_URL=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.6/apache-maven-3.9.6-bin.zip
SET MAVEN_VERSION=3.9.6
SET MAVEN_HOME=%USERPROFILE%\.m2\wrapper\dists\apache-maven-%MAVEN_VERSION%-bin\apache-maven-%MAVEN_VERSION%

IF EXIST "%MAVEN_HOME%\bin\mvn.cmd" GOTO skip_download

echo Downloading Maven %MAVEN_VERSION% on first run, please wait...
IF NOT EXIST "%USERPROFILE%\.m2\wrapper\dists\apache-maven-%MAVEN_VERSION%-bin\" (
    mkdir "%USERPROFILE%\.m2\wrapper\dists\apache-maven-%MAVEN_VERSION%-bin"
)

powershell -Command "& {Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%USERPROFILE%\.m2\wrapper\dists\apache-maven-%MAVEN_VERSION%-bin\maven.zip'}"
powershell -Command "& {Expand-Archive -Path '%USERPROFILE%\.m2\wrapper\dists\apache-maven-%MAVEN_VERSION%-bin\maven.zip' -DestinationPath '%USERPROFILE%\.m2\wrapper\dists\apache-maven-%MAVEN_VERSION%-bin\' -Force}"
del "%USERPROFILE%\.m2\wrapper\dists\apache-maven-%MAVEN_VERSION%-bin\maven.zip"

:skip_download
SET PATH=%MAVEN_HOME%\bin;%PATH%
CALL mvn.cmd %*
