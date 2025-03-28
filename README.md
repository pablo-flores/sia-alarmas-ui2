# OM-SIA-Alarmas-UI2

## Descripción

Este proyecto es una interfaz de usuario para gestionar y visualizar alarmas del Outage Manager. Está desarrollado en Flask y utiliza tecnologías como DataTables para la presentación de datos en tablas, además de Pandas y XlsxWriter para exportación de reportes.

## Requisitos

Para ejecutar este proyecto, necesitas tener instaladas las siguientes dependencias:

```bash
Flask==3.0.3
Flask-PyMongo==2.3.0
pytz==2024.1
requests==2.32.3
XlsxWriter==3.2.0
waitress
numpy==2.0.2
pandas==2.2.2
```

Puedes instalar todas las dependencias necesarias ejecutando:

```bash
pip install -r requirements.txt
```

## Instalación

1. Clona este repositorio:
   ```bash
   git clone https://gitlab.com/telecom-argentina/cio/oss/diagnostico-y-monitoreo/oum/frontend/oum-outagemanager/om-sia-alarmas-ui.git
   ```

2. Navega al directorio del proyecto y crea un entorno virtual (opcional pero recomendado):
   ```bash
   cd om-sia-alarmas-ui
   python -m venv venv
   source venv/bin/activate  # En Windows: venv\Scripts\activate
   ```

3. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```

4. Configura tu base de datos y otros parámetros en el archivo `config.yaml`. Aquí puedes modificar las configuraciones según el entorno de despliegue.

## Uso

1. Para iniciar el servidor en modo desarrollo, puedes ejecutar el siguiente comando:

   ```bash
   flask run
   ```

   También puedes ejecutar la aplicación usando Waitress (servidor WSGI):

   ```bash
   waitress-serve --call 'app:create_app'
   ```

2. Abre tu navegador y navega a `http://localhost:5000` para ver la aplicación en funcionamiento.

### Exportación de datos

El proyecto permite exportar los datos de las alarmas en formato Excel o CSV a través de las funcionalidades del frontend. Puedes descargar los datos actuales presionando el botón "Exportar Excel" o "Exportar CSV" dentro de la interfaz de usuario.

## Estructura del proyecto

- `app.py`: Archivo principal que contiene la lógica de la aplicación.
- `config.yaml`: Archivo de configuración donde se definen las variables necesarias para la conexión a la base de datos y otros parámetros.
- `static/`: Carpeta que contiene los archivos estáticos como CSS, JavaScript y las imágenes necesarias.
- `templates/`: Carpeta que contiene las plantillas HTML que se renderizan en el navegador.
- `requirements.txt`: Lista de dependencias necesarias para ejecutar la aplicación.
  
## Contribuciones

Si deseas contribuir al proyecto, por favor sigue estos pasos:

1. Haz un fork del repositorio.
2. Crea una nueva rama para tus cambios: `git checkout -b mi-nueva-funcionalidad`.
3. Realiza los cambios necesarios y haz un commit: `git commit -m 'Agrega nueva funcionalidad'`.
4. Envía los cambios a tu fork: `git push origin mi-nueva-funcionalidad`.
5. Crea un Pull Request detallando los cambios realizados.



### `README.md`

```md
# Outage Manager - Alarmas Activas

Este proyecto es una aplicación web que muestra las **Alarmas Activas en el Outage Manager**. Utiliza **Flask** como framework principal, junto con **Flask-PyMongo** para la conexión a una base de datos MongoDB. La interfaz está diseñada con **HTML** y **JavaScript**, utilizando **DataTables** para gestionar y visualizar datos en formato tabular, y **pandas** para manejar datos en el backend.

## Características

- Visualización de alarmas activas desde MongoDB.
- Filtros dinámicos por cada columna usando **DataTables**.
- Exportación de datos en formato **CSV** y **Excel**.
- Interfaz interactiva para gestionar alarmas.
- Backend que convierte datos de MongoDB a **pandas** DataFrame para exportaciones.

## Instalación

### Requisitos

Asegúrate de tener **Python 3.x** instalado en tu sistema.

1. Clona este repositorio:
   ```bash
   git clone https://github.com/pablo-flores/sia-alarmas-ui.git
   ```
2. Navega al directorio del proyecto:
   ```bash
   cd sia-alarmas-ui
   ```
3. Instala las dependencias necesarias utilizando el archivo `requirements.txt`:
   ```bash
   pip install -r requirements.txt
   ```

## Configuración

El archivo `config.yaml` contiene las configuraciones del proyecto. Asegúrate de configurar las variables de entorno correctas para la conexión a MongoDB:

```yaml
MONGO_URI: "mongodb+srv://<usuario>:<password>@cluster.mongodb.net/OutageManager"
MONGO_USER: "<tu_usuario>"
MONGO_PASS: "<tu_password>"
```

### Levantar el servidor

Puedes ejecutar la aplicación de Flask utilizando el servidor `waitress`. Ejecuta el siguiente comando para levantar el servidor:

```bash
waitress-serve --listen=0.0.0.0:8081 app:app
waitress-serve --listen=0.0.0.0:8081 --threads=10 --backlog=1024 --ident=SIAalarmas --connection-limit=500 app:app
```

Luego accede a la aplicación en tu navegador en la dirección `http://localhost:8081`.

## Uso

### Visualización de alarmas

Cuando accedas a la aplicación, verás una tabla que lista las alarmas activas en el Outage Manager. La tabla es interactiva y te permite realizar búsquedas y ordenar los datos por cada columna.

### Exportación de datos

Puedes exportar los datos visibles en la tabla en los siguientes formatos:
- **CSV**: Haz clic en el botón `Exportar CSV` para descargar los datos en formato CSV.
- **Excel**: Haz clic en el botón `Exportar Excel` para descargar los datos en formato Excel.

## Dependencias

El proyecto utiliza las siguientes dependencias, que están listadas en el archivo `requirements.txt`:

```txt
Flask==3.0.3
Flask-PyMongo==2.3.0
pytz==2024.1
requests==2.32.3
pandas==2.0.3
XlsxWriter==3.2.0
waitress==3.0.0
```

## Estructura del Proyecto

```bash
├── app.py              # Archivo principal de la aplicación Flask
    ├── viewTop10.html      # Archivo HTML para la vista principal
├── config.yaml         # Archivo de configuración para MongoDB
├── requirements.txt    # Lista de dependencias del proyecto
└── README.md           # Este archivo

project_root/
│
├── static/
│   ├── vendor/
│   │   ├── js/
│   │   │   ├── jquery-3.6.0.min.js
│   │   │   ├── jquery.dataTables.min.js
│   │   │   ├── xlsx.full.min.js
│   │   └── ...
│   └── ...
├── templates/
│   ├── your_file.html
│   └── ...
└── app.py

```


## Contribuir

Si deseas contribuir a este proyecto, sigue estos pasos:

1. Haz un fork de este repositorio.
2. Crea una nueva rama: `git checkout -b mi-nueva-funcionalidad`.
3. Realiza los cambios y haz commit: `git commit -am 'Agregué nuevas funcionalidades'`.
4. Haz push a la rama: `git push origin mi-nueva-funcionalidad`.
5. Abre un Pull Request.

## Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.
```

### Explicación:
- **Descripción**: Da una descripción clara de la funcionalidad del proyecto.
- **Instalación**: Instrucciones sobre cómo clonar el repositorio y cómo instalar las dependencias.
- **Configuración**: Explica cómo configurar la base de datos MongoDB utilizando el archivo `config.yaml`.
- **Levantamiento del servidor**: Se describe cómo levantar el servidor con **waitress**.
- **Dependencias**: Lista las dependencias del proyecto desde el archivo `requirements.txt`.
- **Estructura del Proyecto**: Muestra un árbol de archivos básico del proyecto.
- **Contribuir**: Describe cómo contribuir al proyecto.

Este `README.md` cubre los aspectos básicos del proyecto y puede ser fácilmente personalizado para agregar más detalles específicos si es necesario.

Si deseas más ajustes, ¡házmelo saber!

## Licencia

Telecom Argentina

## Autores

- Pablo Flores - <pabflores@teco.com.ar>
