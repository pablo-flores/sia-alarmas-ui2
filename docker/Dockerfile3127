# Usar ubi9 como imagen base sin Python preinstalado
FROM registry.access.redhat.com/ubi9/ubi:latest

# Actualizar paquetes e instalar dependencias necesarias
RUN dnf update -y && \
    dnf install -y \
        gcc \
        openssl-devel \
        bzip2-devel \
        libffi-devel \
        zlib-devel \
        make \
        wget \
        tar \
        xz-devel \
        sqlite-devel \
        tk-devel \
        gdbm-devel \
        libuuid-devel \
        libnsl2-devel \
        readline-devel \
        bzip2-devel \
        expat-devel \
        ncurses-devel \
        && \
    dnf clean all

# Descargar e instalar Python 3.12.7
RUN cd /usr/src && \
    wget https://www.python.org/ftp/python/3.12.7/Python-3.12.7.tgz && \
    tar xzf Python-3.12.7.tgz && \
    cd Python-3.12.7 && \
    ./configure --enable-optimizations && \
    make altinstall && \
    ln -s /usr/local/bin/python3.12 /usr/bin/python3 && \
    ln -s /usr/local/bin/pip3.12 /usr/bin/pip3 && \
    cd / && \
    rm -rf /usr/src/Python-3.12.7*

# Verificar la instalación de Python
RUN python3 --version

# Establecer el directorio de trabajo
WORKDIR /projects

# Copiar el contenido de tu aplicación al directorio de trabajo
COPY . .

# Instalar las dependencias de Python usando pip3
RUN \
  if [ -f requirements.txt ]; \
    then pip3 install -r requirements.txt; \
  elif [ `ls -1q *.txt | wc -l` == 1 ]; \
    then pip3 install -r *.txt; \
  fi

# Exponer el puerto
EXPOSE 8081/tcp

# Variables de entorno recomendadas para OCP
ENV PYTHONUNBUFFERED=1 \
    FLASK_ENV=production \
    PORT=8081 \
    FLASK_PORT=8081

# Comando para ejecutar tu aplicación con waitress
CMD ["waitress-serve", "--listen=0.0.0.0:8081", "app:app"]
