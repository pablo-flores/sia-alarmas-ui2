import logging
from flask import Flask, render_template, Response, jsonify, request
from pymongo import ASCENDING, DESCENDING
from datetime import datetime, timedelta
from flask_pymongo import PyMongo
from pytz import timezone, utc
import pandas as pd
import os
from bson import ObjectId  # Importa ObjectId aquí

# Configuración del logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__, template_folder="templates")

db_name = 'OutageManager'
port = 27017
collection = 'alarm'
username = os.getenv('MONGO_USER')
password = os.getenv('MONGO_PASS')
hostmongodb = os.getenv('MONGODB_URI')

# Obtén el valor de DAYS_CLEARED_AGO, si no existe, usa 4 como valor por defecto
days_configMap = int(os.getenv('DAYS_CLEARED_AGO', 4))

# Verificar las variables de entorno
if username and password and hostmongodb:
    hostmongodb = hostmongodb.replace('${MONGO_USER}', username).replace('${MONGO_PASS}', password)
    logger.info("Variables de entorno de MongoDB definidas correctamente.")
else:
    logger.warning("Las variables de entorno MONGODB_URI, MONGO_USER o MONGO_PASS no están definidas.")

# Configuración de la conexión con MongoDB
app.config["MONGO_URI"] = hostmongodb
mongo = PyMongo(app)

# Definir la zona horaria Local (Buenos Aires)
buenos_aires_tz = timezone('America/Argentina/Buenos_Aires')

# Variable para controlar la primera llamada
first_call = True


# Ruta principal que carga la página
@app.route('/')
def index():
    # Obtener la IP real del cliente usando 'X-Forwarded-For'
    if request.headers.get('X-Forwarded-For'):
        client_ip = request.headers.get('X-Forwarded-For').split(',')[0].strip()
    else:
        client_ip = request.remote_addr

    
    return render_template('viewAlarmsOUM.html', days_configMap=days_configMap)

# Función para convertir ObjectId a str en los resultados
def convert_object_ids(data):
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                for key, value in item.items():
                    if isinstance(value, ObjectId):
                        item[key] = str(value)
    elif isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, ObjectId):
                data[key] = str(value)
    return data


@app.route('/search_alarm', methods=['GET'])
def search_alarm():
    query = request.args.get('query')
    if not query:
        return jsonify({"error": "No query provided"}), 400

    # Buscar en la colección 'receiver_request_audit'
    result_audit = list(mongo.db.receiver_request_audit.find({
        "$or": [
            {"alarmId": query},
            {"origenId": query}
        ]
    }))

    # Buscar en las colecciones 'trifecta-prod-ps' y 'trifecta-prod-ph'
    result_trifecta = list(mongo.db.get_collection("trifecta-prod-ps").aggregate([
        {
            "$match": {
                "$or": [
                    {"alarmId": query},
                    {"origenId": query}
                ]
            }
        },
        {
            "$unionWith": {
                "coll": "trifecta-prod-ph",
                "pipeline": [
                    {
                        "$match": {
                            "$or": [
                                {"alarmId": query},
                                {"origenId": query}
                            ]
                        }
                    }
                ]
            }
        }
    ]))

    # Combinar los resultados
    combined_results = result_audit + result_trifecta

    # Convertir ObjectId a str antes de devolver los resultados
    combined_results = convert_object_ids(combined_results)

    return jsonify(combined_results)


# Nueva ruta para obtener las alarmas en formato JSON
@app.route('/get_alarmas', methods=['GET'])
def get_alarmas():

    # Check for 'X-Forwarded-For' header first
    if request.headers.get('X-Forwarded-For'):
        client_ip = request.headers.get('X-Forwarded-For').split(',')[0].strip()  # Take the first IP in the list
    else:
        client_ip = request.remote_addr

    client_user = request.remote_user
    logger.info(f"Client IP: {client_ip} Client user: {client_user} - Accediendo a /get_alarmas.")
         

    days_ago = datetime.now(buenos_aires_tz) - timedelta(days=days_configMap)  # default 4
    logger.info(f"Consultando alarmas desde {days_ago}.")

    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 15))
    skip = (page - 1) * limit
    search_value = request.args.get('search[value]', '')

    
    # Get sorting information
    order_column_index = request.args.get('order[0][column]', '7')  # Default to column index 7 omArrivalTimestamp
    order_direction = request.args.get('order[0][dir]', 'desc')  # Default to ascending

    # Map column indices to database fields
    column_mapping = {
        '0': 'alarmId',
        '1': 'origenId',
        '2': 'alarmState',
        '3': 'alarmType',
        '4': 'alarmRaisedTime',
        '5': 'alarmClearedTime',
        '6': 'alarmReportingTime',
        '7': 'omArrivalTimestamp',
        '8': 'timeDifference',
        '9': 'TypeNetworkElement',
        '10': 'networkElementId',
        '11': 'clients',
        '12': 'timeResolution'
    }

    # Determine the field to sort by and the direction
    if order_column_index is None:  # No sorting column specified, use default sorting
        sort_field = '_id'
        sort_direction = DESCENDING
    else:
        sort_field = column_mapping.get(order_column_index, 'omArrivalTimestamp')  # Default to 'omArrivalTimestamp'
        sort_direction = ASCENDING if order_direction == 'asc' else DESCENDING
    
    # Debugging: Print the sorting information
    print(f"Sorting by: {sort_field}, Direction: {order_direction}, search_value: {search_value}")

    # Construct the search filter if a search value is provided
    search_filter = {
        "$or": [
            {"alarmId": {"$regex": search_value, "$options": "i"}},
            {"alarmType": {"$regex": search_value, "$options": "i"}},
            {"alarmState": {"$regex": search_value, "$options": "i"}},
            {"clients": {"$regex": search_value, "$options": "i"}},
            {"networkElementId": {"$regex": search_value, "$options": "i"}},
            {"origenId": {"$regex": search_value, "$options": "i"}},
            {"sourceSystemId": {"$regex": search_value, "$options": "i"}},
            {"omArrivalTimestamp": {"$regex": search_value, "$options": "i"}},
            {"alarmRaisedTime": {"$regex": search_value, "$options": "i"}},
            {"alarmClearedTime": {"$regex": search_value, "$options": "i"}},
            {"alarmReportingTime": {"$regex": search_value, "$options": "i"}},
            {"TypeNetworkElement": {"$regex": search_value, "$options": "i"}},
            {"timeResolution": {"$regex": search_value, "$options": "i"}},
            {"timeDifference": {"$regex": search_value, "$options": "i"}}
        ]
    }

    # Combine search filter with the existing query
    query_filter = {
        "$or": [
            {"alarmState": {"$in": ['RAISED', 'UPDATED', 'RETRY']}},
            {"alarmState": "CLEARED", "alarmClearedTime": {"$gte": days_ago}}
        ]
    }
    if search_filter:
        query_filter = {"$and": [query_filter, search_filter]}


    # Perform the database query with pagination
    cursor = mongo.db.alarm.find(
        query_filter,
        {
            "_id": 0,
            "alarmId": 1,
            "alarmType": 1,
            "alarmState": 1,
            "clients": 1,
            "TypeNetworkElement": "$networkElement.type",
            "networkElementId": 1,
            "timeResolution": 1,
            "sourceSystemId": 1,
            "origenId": 1,
            "inicioOUM": "$omArrivalTimestamp",
            "alarmRaisedTime": 1,
            "alarmClearedTime": 1,
            "alarmReportingTime": 1
        }
    ).sort(sort_field, sort_direction).skip(skip).limit(limit)

    alarmas = []
    for alarma in cursor:
        if alarma.get('inicioOUM'):
            alarma['inicioOUM'] = alarma.get('inicioOUM').replace(tzinfo=utc).astimezone(buenos_aires_tz).strftime('%m-%d %H:%M:%S')
        else:
            alarma['inicioOUM'] = '-'

        if alarma.get('alarmRaisedTime'):
            alarma['alarmRaisedTime'] = alarma.get('alarmRaisedTime').replace(tzinfo=utc).astimezone(buenos_aires_tz).strftime('%m-%d %H:%M:%S')
        else:
            alarma['alarmRaisedTime'] = '-'

        if alarma.get('alarmClearedTime'):
            alarma['alarmClearedTime'] = alarma.get('alarmClearedTime').replace(tzinfo=utc).astimezone(buenos_aires_tz).strftime('%m-%d %H:%M:%S')
        else:
            alarma['alarmClearedTime'] = '-'

        if alarma.get('alarmReportingTime'):
            alarma['alarmReportingTime'] = alarma.get('alarmReportingTime').replace(tzinfo=utc).astimezone(buenos_aires_tz).strftime('%m-%d %H:%M:%S')
        else:
            alarma['alarmClearedTime'] = '-'

        if not alarma.get('timeResolution'):
            alarma['timeResolution'] = '-'     

#        # Apply conversion to alarmState
#        alarmState = alarma.get('alarmState', '').strip()
#        if alarmState in ['UPDATED', 'RETRY']:
#            alarma['alarmState'] = 'RAISED'
        
#        if alarma['alarmClearedTime'] != '-':
#            alarma['alarmState'] = 'CLEARED'

        
        alarm_id = alarma.get('alarmId') or ''
        origen_id = alarma.get('origenId') or ''
        # infiere el origen por la numeracion
        sourceSystem_id = alarma.get('sourceSystemId') or ''
        timeResolution = alarma.get('timeResolution') or ''

        if len(origen_id) == 24:
            alarma['origenId'] = 'FMS ' + origen_id
        elif len(origen_id) == 10 or len(origen_id) == 13:
            alarma['origenId'] = 'FMC ' + origen_id[:10]
        else:
            alarma['origenId'] = 'ICD ' + origen_id

            
        if len(alarm_id) == 24:
            alarma['alarmId'] = 'FMS ' + alarm_id
        elif len(alarm_id) == 10 or len(alarm_id) == 13:
            alarma['alarmId'] = 'FMC ' + alarm_id[:10]
        else:
            alarma['alarmId'] = 'ICD ' + alarm_id                


        alarma['timeResolution'] = str(timeResolution) + 'hs'


        if alarma.get('inicioOUM') and alarma.get('alarmRaisedTime'):
            inicio_outage = datetime.strptime(alarma['inicioOUM'], '%m-%d %H:%M:%S')
            inicio_alarma = datetime.strptime(alarma['alarmRaisedTime'], '%m-%d %H:%M:%S')
            time_difference = (inicio_outage - inicio_alarma).total_seconds() / 60  # Difference in minutes
            alarma['timeDifference'] = str(int(time_difference)) + 'min' # Round to 0 decimal places
        else:
            alarma['timeDifference'] = '-'

        # si el alarmId es igual que el origenId no lo muestra
        alarm_id = alarma.get('alarmId') or ''
        origen_id = alarma.get('origenId') or ''
        if (alarm_id == origen_id):
            alarma['origenId'] = '-'


        alarmas.append(alarma)


    # Count total documents for pagination
    total_count = mongo.db.alarm.count_documents(query_filter)

    logger.info(f"Se encontraron {len(alarmas)} alarmas.")
    return jsonify({
        "draw": int(request.args.get('draw', 1)),
        "recordsTotal": total_count,
        "recordsFiltered": total_count,
        "data": alarmas
    })

# Ruta para exportar los datos
@app.route('/export/<format>')
def export_data(format):
    days_ago = datetime.now(buenos_aires_tz) - timedelta(days=days_configMap)  # default 4
    logger.info(f"Exportando alarmas en formato {format}.")

    cursor = mongo.db.alarm.find(
        {
            "$or": [
                { 
                    "alarmState": { "$in": ['RAISED', 'UPDATED', 'RETRY'] }
                },
                {
                    "alarmState": "CLEARED",
                    "alarmClearedTime": { "$gte": days_ago }
                }
            ]
        },
        {   "_id": 0,
            "alarmId": 1, "alarmState": 1, "alarmType": 1, 
            "inicioOUM": "$omArrivalTimestamp", "alarmRaisedTime": 1, "alarmReportingTime":1, "alarmClearedTime": 1,              
            "TypeNetworkElement": "$networkElement.type", "networkElementId": 1, "clients": 1,
            "timeResolution": 1, "sourceSystemId": 1, "origenId": 1            
        }
    ).sort("_id", -1)

    alarmas = list(cursor)

    # Reemplazar "UPDATED" y "RETRY" por "RAISED" en el estado de la alarma
    for alarma in alarmas:
        if alarma.get('alarmState') in ['UPDATED', 'RETRY']:
            alarma['alarmState'] = 'RAISED'

    df = pd.DataFrame(alarmas)

    # Reordenar las columnas
    df = df[['alarmId', 'alarmState', 'alarmType', 'inicioOUM', 'alarmRaisedTime', 'alarmReportingTime', 'alarmClearedTime', 
             'TypeNetworkElement', 'networkElementId', 'clients', 'timeResolution', 'sourceSystemId', 'origenId']]

    fecha_actual = datetime.now(buenos_aires_tz).strftime('%Y%m%d%H%M%S')

    if format == 'csv':
        csv_data = df.to_csv(index=False)
        logger.info("Exportación a CSV completa.")
        return Response(csv_data, mimetype="text/csv", headers={"Content-disposition": f"attachment; filename=SIA_alarmas_{fecha_actual}.csv"})
    elif format == 'excel':
        output = pd.ExcelWriter('/tmp/alarmas.xlsx', engine='xlsxwriter')
        df.to_excel(output, index=False)
        output.close()

        with open('/tmp/alarmas.xlsx', 'rb') as f:
            excel_data = f.read()
        logger.info("Exportación a Excel completa.")
        return Response(excel_data, mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        headers={"Content-disposition": f"attachment; filename=SIA_alarmas_{fecha_actual}.xlsx"})
    else:
        logger.warning("Formato de exportación no soportado.")
        return "Unsupported format. Please use 'csv' or 'excel'."

if __name__ == '__main__':
    port = os.environ.get('FLASK_PORT') or 8080
    logger.info(f"Iniciando la aplicación en el puerto {port}.")
    app.run(port=int(port), host='0.0.0.0')
