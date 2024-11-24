import logging, time
from flask import Flask, render_template, Response, jsonify, request
from pymongo import ASCENDING, DESCENDING
from datetime import datetime, timedelta
from flask_pymongo import PyMongo
from pytz import timezone, utc
import pandas as pd
import os
from bson import ObjectId  # Importa ObjectId aquí
from flask_wtf.csrf import CSRFProtect
from flask_cors import CORS

# Configuración del logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__, template_folder="templates", static_folder="static")
csrf = CSRFProtect(app)
CORS(app)

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

    # generar un valor de timestamp automáticamente usando el tiempo actual
    timestamp = int(time.time())
    
    return render_template('viewAlarmsOUM.html', days_configMap=days_configMap, timestamp=timestamp)
    #return render_template('viewAlarmsOUM.html', days_configMap=days_configMap)


def convert_object_ids(data):
    for item in data:
        if '_id' in item and isinstance(item['_id'], ObjectId):
            item['_id'] = str(item['_id'])
    return data

@app.route('/search_alarm', methods=['GET'])
def search_alarm():
    query = request.args.get('query')
    page = request.args.get('page', default='1')
    limit = request.args.get('limit', default='10')

    # Validar y convertir los parámetros de paginación
    try:
        page = int(page)
        limit = int(limit)
        if page < 1 or limit < 1:
            raise ValueError
    except ValueError:
        return jsonify({"error": "Parámetros de paginación inválidos"}), 400

    if not query:
        return jsonify({"error": "No se proporcionó una consulta"}), 400

    skip = (page - 1) * limit

    # Tubería de agregación para unir las colecciones y aplicar la paginación
    pipeline = [
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
        },
        {
            "$unionWith": {
                "coll": "receiver_request_audit",
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
        },
        {
            "$facet": {
                "metadata": [ { "$count": "total" } ],
                "data": [ { "$skip": skip }, { "$limit": limit } ]
            }
        },
        {
            "$unwind": {
                "path": "$metadata",
                "preserveNullAndEmptyArrays": True
            }
        },
        {
            "$addFields": {
                "metadata.total": { "$ifNull": [ "$metadata.total", 0 ] }
            }
        }
    ]

    # Ejecutar la agregación en 'trifecta-prod-ps'
    aggregation_result = list(mongo.db.get_collection("trifecta-prod-ps").aggregate(pipeline))
    if len(aggregation_result) > 0:
        total = aggregation_result[0].get('metadata', {}).get('total', 0)
        data = aggregation_result[0].get('data', [])
    else:
        total = 0
        data = []

    # Convertir ObjectId a str antes de devolver los resultados
    data = convert_object_ids(data)

    # Calcular el total de páginas
    total_pages = (total + limit - 1) // limit if total > 0 else 1

    return jsonify({
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages,
        "data": data
    })
    
# Nueva ruta para obtener las alarmas en formato JSON
@app.route('/get_alarmas', methods=['GET'])
def get_alarmas():
    # Obtener la IP del cliente
    if request.headers.get('X-Forwarded-For'):
        client_ip = request.headers.get('X-Forwarded-For').split(',')[0].strip()
    else:
        client_ip = request.remote_addr

    client_user = request.remote_user
    logger.info(f"Client IP: {client_ip} Client user: {client_user} - Accediendo a /get_alarmas.")

    # Calcular la fecha límite para alarmas CLEARED
    days_ago = datetime.now(buenos_aires_tz) - timedelta(days=days_configMap)
    logger.info(f"Consultando alarmas desde {days_ago}.")

    # Obtener parámetros de paginación
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 15))
    skip = (page - 1) * limit
    search_value = request.args.get('search[value]', '').strip()

    # Obtener información de ordenamiento
    order_column_index = request.args.get('order[0][column]', '7')  # Por defecto, omArrivalTimestamp
    order_direction = request.args.get('order[0][dir]', 'desc')  # Por defecto, descendente

    # Mapeo de índices de columna a campos de la base de datos
    column_mapping = {
        '0': 'alarmId',
        '1': 'origenId',
        '2': 'alarmState',
        '3': 'alarmType',
        '4': 'alarmRaisedTime',
        '5': 'alarmClearedTime',
        '6': 'alarmReportingTime',
        '7': 'omArrivalTimestamp',
        '8': 'timeDifferenceNumeric',  # Campo calculado numérico
        '9': 'timeDifferenceNumericIncident', # Campo calculado numérico               
        '10': 'TypeNetworkElement',
        '11': 'networkElementId',
        '12': 'clients',
        '13': 'timeResolution',
        '14': 'sequence'
    }

    # Determinar el campo de ordenamiento y la dirección
    sort_field = column_mapping.get(order_column_index, 'omArrivalTimestamp')
    sort_direction = ASCENDING if order_direction.lower() == 'asc' else DESCENDING

    logger.info(f"Sorting by: {sort_field}, Direction: {order_direction}, search_value: '{search_value}'")

    # Construir el filtro de búsqueda si se proporciona un valor de búsqueda
    search_filter = {}
    if search_value:
        search_regex = {"$regex": search_value, "$options": "i"}
        search_filter = {
            "$or": [
                {"alarmId": search_regex},
                {"alarmType": search_regex},
                {"alarmState": search_regex},
                {"clients": search_regex},
                {"networkElementId": search_regex},
                {"origenId": search_regex},
                {"sourceSystemId": search_regex},
                {"omArrivalTimestamp": search_regex},
                {"alarmRaisedTime": search_regex},
                {"alarmClearedTime": search_regex},
                {"timeDifferenceNumeric": search_regex},
                {"timeDifferenceNumericIncident": search_regex},
                {"alarmReportingTime": search_regex},
                {"networkElement.type": search_regex},   
                {"timeResolution": search_regex},
                {"sequence": search_regex}
            ]
        }

    # Construir el filtro principal excluyendo 'DAMAGED'
    query_filter = {
        "$or": [
            {"alarmState": {"$in": ['RAISED', 'UPDATED', 'RETRY']}},
            {"alarmState": "CLEARED", "alarmClearedTime": {"$gte": days_ago}}
        ]
    }

    # Combinar con el filtro de búsqueda si existe
    if search_filter:
        query_filter = {"$and": [query_filter, search_filter]}

    #logger.info(f"query_filter: {query_filter}")

    # Construir el pipeline de agregación
    pipeline = [
        {
            "$match": query_filter
        },
        {
            "$addFields": {
                # Reemplazar 'UPDATED' y 'RETRY' por 'RAISED' en 'alarmState'
                "alarmState": {
                    "$cond": {
                        "if": {"$in": ["$alarmState", ["UPDATED", "RETRY"]]},
                        "then": "RAISED",
                        "else": "$alarmState"
                    }
                },
                # Calcular 'timeDifferenceNumeric' sin redondeo
                "timeDifferenceNumeric": {
                    "$divide": [
                        {"$subtract": ["$omArrivalTimestamp", "$alarmRaisedTime"]},
                        60000  # Convertir milisegundos a minutos
                    ]
                },
                # Calcular 'timeDifferenceNumericIncident' sin redondeo
                "timeDifferenceNumericIncident": {
                    "$divide": [
                        {"$subtract": ["$alarmReportingTime", "$alarmRaisedTime"]},
                        60000  # Convertir milisegundos a minutos
                    ]
                },

                # Formatear 'timeDifference' como cadena con 'min'  parte visual
                "timeDifferenceIncident": {
                    "$concat": [
                        # Determinar si el tiempo es negativo
                        {
                            "$cond": [
                                { "$lt": [
                                    { "$subtract": ["$alarmReportingTime", "$alarmRaisedTime"] },
                                    0
                                ]},
                                "-",  # Si es negativo, agregar "-"
                                ""    # Si no, dejar vacío
                            ]
                        },
                        # Convertir los minutos a string con dos dígitos si es necesario
                        {
                            "$cond": [
                                { "$lt": [
                                    { "$floor": {
                                        "$divide": [
                                            { "$abs": { "$subtract": ["$alarmReportingTime", "$alarmRaisedTime"] }},
                                            60000
                                        ]}
                                    },
                                    10
                                ]},
                                # Si los minutos son menores que 10, agrega un 0 delante
                                { "$concat": [
                                    "0",
                                    { "$toString": {
                                        "$floor": {
                                            "$divide": [
                                                { "$abs": { "$subtract": ["$alarmReportingTime", "$alarmRaisedTime"] }},
                                                60000
                                            ]
                                        }
                                    }}
                                ]},
                                # Si no, usa el valor tal cual
                                { "$toString": {
                                    "$floor": {
                                        "$divide": [
                                            { "$abs": { "$subtract": ["$alarmReportingTime", "$alarmRaisedTime"] }},
                                            60000
                                        ]
                                    }
                                }}
                            ]
                        },
                        ":",
                        # Convertir los segundos restantes a string con dos dígitos
                        {
                            "$cond": [
                                { "$lt": [
                                    { "$mod": [
                                        { "$floor": {
                                            "$divide": [
                                                { "$abs": { "$subtract": ["$alarmReportingTime", "$alarmRaisedTime"] }},
                                                1000
                                            ]}
                                        },
                                        60
                                    ]},
                                    10
                                ]},
                                # Si los segundos son menores que 10, agrega un 0 delante
                                { "$concat": [
                                    "0",
                                    { "$toString": {
                                        "$mod": [
                                            { "$floor": {
                                                "$divide": [
                                                    { "$abs": { "$subtract": ["$alarmReportingTime", "$alarmRaisedTime"] }},
                                                    1000
                                                ]}
                                            },
                                            60
                                        ]
                                    }}
                                ]},
                                # Si no, usa el valor tal cual
                                { "$toString": {
                                    "$mod": [
                                        { "$floor": {
                                            "$divide": [
                                                { "$abs": { "$subtract": ["$alarmReportingTime", "$alarmRaisedTime"] }},
                                                1000
                                            ]}
                                        },
                                        60
                                    ]
                                }}
                            ]
                        },
                        " min"
                    ]
                }
,
                "timeDifference": {
                    "$concat": [
                        # Convertir los minutos a string
                        { "$toString": {
                            "$floor": {
                                "$divide": [
                                    { "$subtract": ["$omArrivalTimestamp", "$alarmRaisedTime"] },
                                    60000
                                ]
                            }
                        }},
                        ":",
                        # Convertir los segundos restantes a string con dos dígitos
                        {
                            "$cond": [
                                { "$lt": [
                                    { "$mod": [
                                        { "$divide": [
                                            { "$subtract": ["$omArrivalTimestamp", "$alarmRaisedTime"] },
                                            1000
                                        ]},
                                        60
                                    ]},
                                    10
                                ]},
                                # Si los segundos son menores que 10, agrega un 0 delante
                                { "$concat": [
                                    "0",
                                    { "$toString": {
                                        "$floor": {
                                            "$mod": [
                                                { "$divide": [
                                                    { "$subtract": ["$omArrivalTimestamp", "$alarmRaisedTime"] },
                                                    1000
                                                ]},
                                                60
                                            ]
                                        }
                                    }}
                                ]},
                                # Si no, usa el valor tal cual
                                { "$toString": {
                                    "$floor": {
                                        "$mod": [
                                            { "$divide": [
                                                { "$subtract": ["$omArrivalTimestamp", "$alarmRaisedTime"] },
                                                1000
                                            ]},
                                            60
                                        ]
                                    }
                                }}
                            ]
                        },
                        " min"
                    ]
                },

                # Formatear 'timeDifference' como cadena con 'min'
                "timeDifferencexxx": {
                    "$concat": [
                        {"$toString": {
                            "$round": {
                                "$divide": [
                                    {"$subtract": ["$omArrivalTimestamp", "$alarmRaisedTime"]},
                                    60000
                                ]
                            }
                        }},
                        "min"
                    ]
                }
            }
        },
        {
            "$sort": {sort_field: 1} if sort_direction == ASCENDING else {sort_field: -1}
        },
        {
            "$skip": skip
        },
        {
            "$limit": limit
        },
        {
            "$project": {
                "_id": 0,
                "outageId": 1,
                "alarmId": 1,
                "alarmType": 1,
                "alarmState": 1,  # Campo actualizado
                "clients": 1,
                "TypeNetworkElement": "$networkElement.type",
                "networkElementId": 1,
                "timeResolution": 1,
                "sourceSystemId": 1,
                "origenId": 1,
                "inicioOUM": "$omArrivalTimestamp",
                "alarmRaisedTime": 1,
                "alarmClearedTime": 1,
                "alarmReportingTime": 1,
                "sequence": 1,
                "timeDifference": 1,        # Formateado para visualización
                "timeDifferenceNumeric": 1,  # Campo numérico para ordenación
                "timeDifferenceIncident": 1,        # Formateado para visualización
                "timeDifferenceNumericIncident": 1  # Campo numérico para ordenación                
            }
        }
    ]

    #logger.info(f"pipeline: {pipeline}")

    # Ejecutar el pipeline de agregación
    cursor = mongo.db.alarm.aggregate(pipeline)

    alarmas = []
    for alarma in cursor:
        # Formatear los campos de fecha y hora
        def format_datetime(dt):
            if dt:
                return dt.replace(tzinfo=utc).astimezone(buenos_aires_tz).strftime('%m-%d %H:%M:%S')
            else:
                return '-'

        alarma['inicioOUM'] = format_datetime(alarma.get('inicioOUM'))
        alarma['alarmRaisedTime'] = format_datetime(alarma.get('alarmRaisedTime'))
        alarma['alarmClearedTime'] = format_datetime(alarma.get('alarmClearedTime'))
        alarma['alarmReportingTime'] = format_datetime(alarma.get('alarmReportingTime'))

        # Manejar el campo 'timeResolution'
        if not alarma.get('timeResolution'):
            alarma['timeResolution'] = '-'
        else:
            alarma['timeResolution'] = f"{alarma['timeResolution']}hs"

            # Procesar 'origenId'
            origen_id = alarma.get('origenId', '')
            if len(origen_id) == 24:
                alarma['origenId'] = f"FMS {origen_id}"
            elif len(origen_id) in [10, 13]:
                alarma['origenId'] = f"FMC {origen_id}"
            elif len(origen_id) in [8, 9]:
                alarma['origenId'] = f"ICD {origen_id}"            
            elif origen_id:
                alarma['origenId'] = f"    {origen_id}"
            else:
                alarma['origenId'] = '-'

            # Procesar 'alarmId'
            alarm_id = alarma.get('alarmId', '')  # Define alarm_id here before using it
            if len(alarm_id) == 24:
                alarma['alarmId'] = f"FMS {alarm_id}"
            elif len(alarm_id) in [10, 13]:
                alarma['alarmId'] = f"FMC {alarm_id}"
            elif len(alarm_id) in [8, 9]:
                alarma['alarmId'] = f"ICD {alarm_id}"            
            elif alarm_id:
                alarma['alarmId'] = f"    {alarm_id}"
            else:
                alarma['alarmId'] = '-'

            # 'timeDifference' ya está formateado en la etapa de agregación
            # 'timeDifferenceNumeric' es para referencia y ordenación

            # Si 'alarmId' es igual a 'origenId', establecer 'origenId' a '-'
            if alarma.get('alarmId') == alarma.get('origenId'):
                alarma['origenId'] = '-'



        alarmas.append(alarma)

    # Contar el total de documentos que coinciden con el filtro (sin paginación)
    total_count = mongo.db.alarm.count_documents(query_filter)

    logger.info(f"Se encontraron {len(alarmas)} alarmas en la página {page}.")

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
            "alarmId": 1, "alarmState": 1, "alarmType": 1, "timeDifference": 1, "timeDifferenceIncident": 1, 
            "inicioOUM": "$omArrivalTimestamp", "alarmRaisedTime": 1, "alarmReportingTime":1, "alarmClearedTime": 1,              
            "TypeNetworkElement": "$networkElement.type", "networkElementId": 1, "clients": 1,
            "timeResolution": 1, "sourceSystemId": 1, "origenId": 1, "sequence": 1            
        }
    ).sort("_id", -1)

    alarmas = list(cursor)

    # Reemplazar "UPDATED" y "RETRY" por "RAISED" en el estado de la alarma
    for alarma in alarmas:
        if alarma.get('alarmState') in ['UPDATED', 'RETRY']:
            alarma['alarmState'] = 'RAISED'

    df = pd.DataFrame(alarmas)

    # Reordenar las columnas
    df = df[['alarmId', 'alarmState', 'alarmType', 'inicioOUM', 'alarmRaisedTime', 'alarmReportingTime', 'alarmClearedTime', 'timeDifference', 'timeDifferenceIncident', 
             'TypeNetworkElement', 'networkElementId', 'clients', 'timeResolution', 'sourceSystemId', 'origenId', 'sequence']]

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

