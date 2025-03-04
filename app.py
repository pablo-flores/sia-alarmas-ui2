import logging, time
from flask import Flask, render_template, Response, jsonify, request
from pymongo import ASCENDING, DESCENDING
from datetime import datetime, timedelta, timezone as timezoneZ
from flask_pymongo import PyMongo
from pytz import timezone, utc
import pandas as pd
import os
import secrets
from bson import ObjectId  # Importa ObjectId aquí
from flask_wtf.csrf import CSRFProtect
from flask_cors import CORS
from dateutil import parser, tz
from dateutil.parser import isoparse


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



# Genera una clave secreta segura
app.config['SECRET_KEY'] = secrets.token_hex(32)  # Genera una clave de 64 caracteres hexadecimales


# Variable para controlar la primera llamada
first_call = True

# Configuración del logger
logger = logging.getLogger('app')
logger.setLevel(logging.INFO)


def format_datetime(dt):
    if dt:
        # Asegúrate de que la fecha esté en formato ISO 8601 con zona horaria
        return dt.replace(tzinfo=timezone.utc).astimezone(buenos_aires_tz).isoformat()
    else:
        return '-'

def format_datetime_UPD(dt):
#    if dt:
#        if dt.tzinfo is None:
#            dt = utc.localize(dt)
#        return dt.astimezone(buenos_aires_tz).isoformat()
#    else:
#        return '-'
    if dt:
        return dt.replace(tzinfo=utc).astimezone(buenos_aires_tz).strftime('%d-%m %H:%M:%S')
    else:
        return '-'        



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


@app.route('/get_incident_by_ticketid', methods=['GET'])
def get_incident_by_ticketid():
    """
    Endpoint para buscar incidentes en la colección "incident-read" según el ticket ID.
    """
    try:
        ticketid = request.args.get('ticketid')

        if not ticketid:
            return jsonify({"error": "Se requiere el parámetro 'ticketid'"}), 400

        # Realizar la consulta a la colección "incident-read"
        query = {
            "isglobal": True,           
            "ticketid": ticketid,
            "workorder": {"$exists": True}
        }

        # Ejecutar la consulta
        incidents = list(mongo.db['incident-read'].find(query))

        # Convertir ObjectId a string antes de devolver los resultados
        incidents = convert_object_ids(incidents)

        return jsonify({"data": incidents}), 200

    except Exception as e:
        logger.error(f"Error al obtener incidentes por ticketid: {str(e)}", exc_info=True)
        return jsonify({"error": "Ocurrió un error al buscar los incidentes"}), 500



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
    

@app.route('/formTopologia3D')
def form_topologia_3d():
    #return render_template('formTopologia3D.html')
    return render_template('formTopologiaCliente.html')


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
        '5': 'alarmReportingTime',
        '6': 'timeDifferenceNumericIncident', # Campo calculado numérico              
        '7': 'omArrivalTimestamp',
        '8': 'timeDifferenceNumeric',  # Campo calculado numérico
        '9': 'alarmIncidentTime',
        '10': 'alarmIncidentTimeTo',
        '11': 'alarmWorkOrderTime',
        '12': 'alarmWorkOrderTimeTo',
        '13': 'alarmClearedTime',         
        '14': 'timeDiffNumRep',                 
        '15': 'TypeNetworkElement',
        '16': 'networkElementId',
        '17': 'clients',
        '18': 'timeResolution',
        '19': 'sequence',
        '20': 'plays'
    }

    # Determinar el campo de ordenamiento y la dirección
    sort_field = column_mapping.get(order_column_index, 'omArrivalTimestamp')
    sort_direction = ASCENDING if order_direction.lower() == 'asc' else DESCENDING
    #sort_direction = DESCENDING if order_direction.lower() == 'desc' else ASCENDING

    logger.info(f"Sorting by: {sort_field}, Direction: {order_direction}, search_value: '{search_value}'")

    # Calcula la hora actual en Python
    now = datetime.utcnow()

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
                {"alarmIncidentTime": search_regex},
                {"alarmClearedTime": search_regex},
                {"timeDifferenceNumeric": search_regex},
                {"timeDifferenceNumericIncident": search_regex},
                {"timeDiffRep": search_regex},
                {"timeDiffNumRep": search_regex},                
                {"alarmReportingTime": search_regex},
                {"networkElement.type": search_regex},   
                {"timeResolution": search_regex},
                {"sequence": search_regex},
                {"plays": search_regex}
            ]
        }

    # Construir el filtro principal excluyendo 'DAMAGED'
    query_filter = {
        "$or": [
            {"alarmState": {"$in": ['RAISED', 'UPDATED', 'RETRY']}},
            {"alarmState": "CLEARED", "alarmClearedTime": {"$gte": days_ago}}
        ]
    }

    query_filter_full = {
        "$or": [
            {"alarmState": {"$in": ['RAISED', 'UPDATED', 'RETRY', 'CLEARED']}}
        ]
    }

    # Combinar con el filtro de búsqueda si existe, quita el limite de days_ago !!!
    if search_filter:
        query_filter = {"$and": [query_filter, search_filter]}  #limita a days_ago
        #query_filter = {"$and": [query_filter_full, search_filter]} #quita el limite de days_ago !!!

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
                # Calcular 'timeDiffNumRep' sin redondeo 
                "timeDiffNumRep": {
                    "$divide": [
                        {"$subtract": [{ "$ifNull": ["$alarmClearedTime", now] },"$alarmReportingTime"]},
                        60000  # Convertir milisegundos a minutos
                    ]
                },
             

                # Formatear 'timeDiffRep' como cadena con 'min'  parte visual
                "timeDiffRep": {
                    "$concat": [
                        # Determinar si el tiempo es negativo
                        {
                            "$cond": [
                                { "$lt": [
                                    #{ "$subtract": ["$alarmClearedTime", "$alarmRaisedTime"] },
                                    {"$subtract": [{ "$ifNull": ["$alarmClearedTime", now] },"$alarmReportingTime"]},                                    
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
                                            { "$abs": { "$subtract": [{ "$ifNull": ["$alarmClearedTime", now] },"$alarmReportingTime"] }},
                                            60000
                                        ]}
                                    },
                                    10
                                ]},
                                # Si los minutos son menores que 10, agrega un 0 delante
                                { "$concat": [
                                    "",
                                    { "$toString": {
                                        "$floor": {
                                            "$divide": [
                                                { "$abs": { "$subtract": [{ "$ifNull": ["$alarmClearedTime", now] },"$alarmReportingTime"] }},
                                                60000
                                            ]
                                        }
                                    }}
                                ]},
                                # Si no, usa el valor tal cual
                                { "$toString": {
                                    "$floor": {
                                        "$divide": [
                                            { "$abs": { "$subtract": [{ "$ifNull": ["$alarmClearedTime", now] },"$alarmReportingTime"] }},
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
                                                { "$abs": { "$subtract": [{ "$ifNull": ["$alarmClearedTime", now] },"$alarmReportingTime"] }},
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
                                                    { "$abs": { "$subtract": [{ "$ifNull": ["$alarmClearedTime", now] },"$alarmReportingTime"] }},
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
                                                { "$abs": { "$subtract": [{ "$ifNull": ["$alarmClearedTime", now] },"$alarmReportingTime"] }},
                                                1000
                                            ]}
                                        },
                                        60
                                    ]
                                }}
                            ]
                        },
                        "min"
                    ]
                }
,
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
                                    "",
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
                        "min"
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
                        "min"
                    ]
                }
,
                # Calcular 'alarmIncidentTimeFull' sin redondeo 
                "alarmIncidentTimeFull": {
                    "$cond": {
                        "if": { "$ifNull": ["$alarmIncidentTime", False] },  # Verifica si 'alarmIncidentTime' existe y no es nulo
                        "then": {
                            "$divide": [
                                { "$subtract": ["$alarmIncidentTime", "$alarmRaisedTime"] },
                                60000  # Convertir milisegundos a minutos
                            ]
                        },
                        "else": "-"  # Asigna '-' si 'alarmIncidentTime' es nulo
                    }
                },               
                "alarmIncidentTimeTo": {
                    "$cond": {
                        "if": { "$ifNull": ["$alarmIncidentTime", False] },
                        "then": {
                            "$let": {
                                "vars": {
                                    "incidentTimeOrNow": { "$ifNull": ["$alarmIncidentTime", now] }
                                },
                                "in": {
                                    "$concat": [
                                        # Determinar si el tiempo es negativo
                                        {
                                            "$cond": [
                                                { "$lt": [
                                                    { "$subtract": ["$$incidentTimeOrNow", "$alarmReportingTime"] },                                    
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
                                                            { "$abs": { "$subtract": ["$$incidentTimeOrNow", "$alarmReportingTime"] }},
                                                            60000
                                                        ]}
                                                    },
                                                    10
                                                ]},
                                                # Si los minutos son menores que 10, agrega un 0 delante
                                                { "$concat": [
                                                    "",
                                                    { "$toString": {
                                                        "$floor": {
                                                            "$divide": [
                                                                { "$abs": { "$subtract": ["$$incidentTimeOrNow", "$alarmReportingTime"] }},
                                                                60000
                                                            ]
                                                        }
                                                    }}
                                                ]},
                                                # Si no, usa el valor tal cual
                                                { "$toString": {
                                                    "$floor": {
                                                        "$divide": [
                                                            { "$abs": { "$subtract": ["$$incidentTimeOrNow", "$alarmReportingTime"] }},
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
                                                                { "$abs": { "$subtract": ["$$incidentTimeOrNow", "$alarmReportingTime"] }},
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
                                                                    { "$abs": { "$subtract": ["$$incidentTimeOrNow", "$alarmReportingTime"] }},
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
                                                                { "$abs": { "$subtract": ["$$incidentTimeOrNow", "$alarmReportingTime"] }},
                                                                1000
                                                            ]}
                                                        },
                                                        60
                                                    ]
                                                }}
                                            ]
                                        },
                                        "min"
                                    ]
                                }
                            }
                        },
                        "else": "-"
                    }
                }
                #,
                ## Manejo de 'alarmIncidentTime' con '$ifNull'
                #"alarmIncidentTime": {
                #    "$ifNull": ["$alarmIncidentTime", "-"]
                #}
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
                "_id": 1,
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
                "plays": 1,
                "timeDiffRep": 1,                
                "timeDiffNumRep": 1,                                                
                "timeDifference": 1,        # Formateado para visualización
                "timeDifferenceNumeric": 1,  # Campo numérico para ordenación
                "timeDifferenceIncident": 1,        # Formateado para visualización
                "timeDifferenceNumericIncident": 1,  # Campo numérico para ordenación                
                "alarmIncidentTime": 1,
                "alarmIncidentTimeTo": 1,
                "alarmIncidentTimeFull": 1                
            }
        }
    ]

    #logger.info(f"pipeline: {pipeline}")

    # Ejecutar el pipeline de agregación
    cursor = mongo.db.alarm.aggregate(pipeline)

    alarmas = []
    for alarma in cursor:
        # Formatear los campos de fecha y hora
#        def format_datetime(dt):
#            if dt:
#                return dt.replace(tzinfo=utc).astimezone(buenos_aires_tz).strftime('%m-%d %H:%M:%S')
#            else:
#                return '-'

        def format_datetime_incident(dt):

            if dt and dt != '-':
                if isinstance(dt, str):
                    try:
                        # Intenta parsear la cadena a datetime
                        dt = parser.parse(dt)
                    except ValueError as e:
                        # Manejo de errores si el formato es incorrecto
                        print(f"Error al parsear la fecha: {e}")
                        return '-'
                elif not isinstance(dt, datetime):
                    # Si no es string ni datetime, retornar un valor por defecto o manejar el error
                    print(f"Tipo de dato inesperado: {type(dt)}")
                    return '-'
                
                # Asegurarse de que dt sea consciente de la zona horaria
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=utc)
                else:
                    dt = dt.astimezone(utc)
                
                        # Asegúrate de que la fecha esté en formato ISO 8601 con zona horaria
                #return dt.replace(tzinfo=timezone.utc).astimezone(buenos_aires_tz).isoformat()

                # Convertir a la zona horaria de Buenos Aires y formatear
                #return dt.astimezone(buenos_aires_tz).strftime('%m-%d %H:%M:%S')
                #return dt.replace(tzinfo=utc).strftime('%d-%m %H:%M:%S')
                return dt.replace(tzinfo=utc).strftime('%m-%d %H:%M:%S')

            else:
                return '-'



        def format_datetime(dt):

            if dt and dt != '-':
                if isinstance(dt, str):
                    try:
                        # Intenta parsear la cadena a datetime
                        dt = parser.parse(dt)
                    except ValueError as e:
                        # Manejo de errores si el formato es incorrecto
                        print(f"Error al parsear la fecha: {e}")
                        return '-'
                elif not isinstance(dt, datetime):
                    # Si no es string ni datetime, retornar un valor por defecto o manejar el error
                    print(f"Tipo de dato inesperado: {type(dt)}")
                    return '-'
                
                # Asegurarse de que dt sea consciente de la zona horaria
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=utc)
                else:
                    dt = dt.astimezone(utc)
                
                        # Asegúrate de que la fecha esté en formato ISO 8601 con zona horaria
                #return dt.replace(tzinfo=timezone.utc).astimezone(buenos_aires_tz).isoformat()

                # Convertir a la zona horaria de Buenos Aires y formatear
                return dt.astimezone(buenos_aires_tz).strftime('%d-%m %H:%M:%S')

            else:
                return '-'




        def format_date_full(dt):
            if dt:
                if isinstance(dt, str):
                    try:
                        # Intenta analizar la cadena a un objeto datetime
                        dt = parser.isoparse(dt)
                    except ValueError:
                        logger.error(f"Formato de fecha inválido: {dt}")
                        return '-'
                if isinstance(dt, datetime):
                    # Asegúrate de que el objeto datetime sea consciente de la zona horaria
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=utc)
                    return dt.astimezone(buenos_aires_tz).strftime('%Y-%m-%d %H:%M:%S')
                else:
                    logger.error(f"Tipo de dato inesperado para fecha: {type(dt)}")
                    return '-'
            else:
                return '-'
             



        #ToDo funcion lee OT
        # Llamada a la función
        doc_alarmIncident = get_alarmIncident(alarma.get("_id"))

        if doc_alarmIncident and "alarmIncidentTime" in doc_alarmIncident:
            #print('doc_alarmIncident----------------------:')
            #print(doc_alarmIncident["alarmIncidentTime"])
            
            alarma['alarmIncidentTime'] = format_datetime_incident( doc_alarmIncident["alarmIncidentTime"])
            alarma['alarmIncidentTimeFull'] = format_date_full( doc_alarmIncident["alarmIncidentTime"])
            alarma['alarmIncidentTimeTo'] = formatear_diferencia(alarma.get('alarmRaisedTime'), doc_alarmIncident["alarmIncidentTime"])
            v_alarmIncidentTime = doc_alarmIncident["alarmIncidentTime"]
        else:
            alarma['alarmIncidentTime'] = '-'
            alarma['alarmIncidentTimeFull'] = '-'
            alarma['alarmIncidentTimeTo'] = '-'
            v_alarmIncidentTime = alarma.get('alarmReportingTime')#si es ICD puro el v_alarmIncidentTime debe ser el reporting



        def update_alarma_with_workorder(alarma, work_order, v_alarmIncidentTime):
            if work_order and "fechaIniciaOT" in work_order:
                fecha_inicia_ot = isoparse(work_order["fechaIniciaOT"])
                alarma['alarmWorkOrderTime'] = format_datetime(fecha_inicia_ot)
                alarma['alarmWorkOrderTimeFull'] = format_date_full(fecha_inicia_ot)
                alarma['alarmWorkOrderTimeTo'] = formatear_diferenciaOT(v_alarmIncidentTime, work_order["fechaIniciaOT"]) if v_alarmIncidentTime != '-' else '-'
                alarma['workOrderId'] = work_order["workOrderId"]
                alarma['fechalastUpdate'] = format_datetime(work_order["fechalastUpdate"] if work_order.get("fechalastUpdate") else '-')
            else:
                alarma['alarmWorkOrderTime'] = '-'
                alarma['alarmWorkOrderTimeFull'] = '-'
                alarma['alarmWorkOrderTimeTo'] = '-'
                alarma['workOrderId'] = ' sin OT '
                alarma['fechalastUpdate'] = '-'

        doc_workOrder = get_incident_by_externalrecid(alarma.get("origenId"))
        update_alarma_with_workorder(alarma, doc_workOrder, v_alarmIncidentTime)

        if not doc_workOrder or "fechaIniciaOT" not in doc_workOrder:
            doc_workOrder = get_incident_by_externalrecid(alarma.get("alarmId"))
            update_alarma_with_workorder(alarma, doc_workOrder, v_alarmIncidentTime)

            #22339868
            #22349443
            #22349518
            #22349519
            #22354095

        #print('alarmReportingTime')
        #print(alarma.get('alarmReportingTime'))

        alarma['inicioOUM'] = format_datetime(alarma.get('inicioOUM'))
        alarma['alarmRaisedTime'] = format_datetime(alarma.get('alarmRaisedTime'))
        alarma['alarmClearedTime'] = format_datetime(alarma.get('alarmClearedTime'))
        alarma['alarmReportingTimeFull'] = format_date_full(alarma.get('alarmReportingTime'))  
        alarma['alarmReportingTime'] = format_datetime(alarma.get('alarmReportingTime'))
        
                    
        alarma['_id'] = convert_object_ids(alarma.get('_id'))

        #logger.info(f"alarmReportingTimeFull {alarma['alarmReportingTimeFull']}")

        # Manejar el campo 'alarmIncidentTime'
        if not alarma.get('alarmIncidentTime'):
            alarma['alarmIncidentTime'] = '-'
        else:
            alarma['alarmIncidentTime'] = format_datetime(alarma.get('alarmIncidentTime'))

        # Manejar el campo 'timeResolution'
        if not alarma.get('timeResolution'):
            alarma['timeResolution'] = '-'
        else:
            alarma['timeResolution'] = f"{alarma['timeResolution']}hs"


        
        # Procesa el origen_id según su longitud y devuelve el origenId formateado.
        alarma['origenId'] = procesar_origen_id(alarma.get('origenId', ''))
    

        # Procesar 'alarmId'
        alarm_id = alarma.get('alarmId', '')  # Define alarm_id here before using it
        sourceSystemId = alarma.get('sourceSystemId', '')
        if sourceSystemId == 'ICD':
            alarma['alarmId'] = procesar_origen_id(alarma.get('alarmId', '')) #cuando llega 1ro ICD con el evento de FMS se ajusta
        else:    
            alarma['alarmId'] = f"{sourceSystemId} {alarm_id}"


        # 'timeDifference' ya está formateado en la etapa de agregación
        # 'timeDifferenceNumeric' es para referencia y ordenación

        # Si 'alarmId' es igual a 'origenId', establecer 'origenId' a '-'
        if alarma.get('alarmId') == alarma.get('origenId'):            
            alarma['origenId'] = '-'

        # si es ICD se completa alarmIncidentTime
        if alarma.get('sourceSystemId', '') == 'ICD':
            alarma['alarmIncidentTime'] = alarma['alarmReportingTime']
            alarma['alarmIncidentTimeTo'] = alarma['timeDifferenceIncident'] 




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


def procesar_origen_id(origen_id):
    """
    Procesa el origen_id según su longitud y devuelve el origenId formateado.
    """
    if len(origen_id) == 24:
        return f"FMS {origen_id}"
    elif len(origen_id) in [10, 13]:
        return f"FMC {origen_id}"
    elif len(origen_id) in [8, 9]:
        return f"ICD {origen_id}"
    elif origen_id:
        # Asegura que tenga exactamente 4 caracteres de espacio
        return f"    {origen_id}"
    else:
        return '-'


def convert_object_ids(data):
    if isinstance(data, list):  # Si es una lista, iteramos
        for item in data:
            if '_id' in item and isinstance(item['_id'], ObjectId):
                item['_id'] = str(item['_id'])
        return data
    elif isinstance(data, ObjectId):  # Si es directamente un ObjectId
        return str(data)
    else:
        return data  # No es ni lista ni ObjectId, devolvemos como está



##########

@app.route('/update_visible_alarms', methods=['POST'])
@csrf.exempt  # Exime esta ruta de la protección CSRF
def update_visible_alarms():
    try:
        data = request.get_json()
        original_alarm_ids = data.get('alarm_ids', [])
        
        if not original_alarm_ids:
            logger.warning("No se recibieron alarm_ids en la solicitud.")
            return jsonify({"error": "No se recibieron alarm_ids"}), 400

        # Calcula la hora actual en Python
        now = datetime.utcnow()

        # Consulta a la base de datos usando los alarm_ids originales
        cursor = mongo.db.alarm.find(
            #{"alarmId": {"$in": stripped_alarm_ids}, "alarmState": {"$in": ['RAISED', 'RETRY', 'CLEARED']} }, # sin UPDATE para evitar celda pintada
            {"_id": {"$in": [ObjectId(id_str) for id_str in original_alarm_ids]}},
            {"alarmId": 1, "origenId": 1, "alarmClearedTime": 1, "networkElementId": 1,
                "alarmState": {
                    "$cond": {
                        "if": {"$in": ["$alarmState", ["UPDATED", "RETRY"]]},
                        "then": "RAISED",
                        "else": "$alarmState"
                    }
                },
                # Formatear 'timeDiffRep' como cadena con 'min'  parte visual
                "timeDiffRep": {
                    "$concat": [
                        # Determinar si el tiempo es negativo
                        {
                            "$cond": [
                                { "$lt": [
                                    #{ "$subtract": ["$alarmClearedTime", "$alarmRaisedTime"] },
                                    {"$subtract": [{ "$ifNull": ["$alarmClearedTime", now] },"$alarmReportingTime"]},  
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
                                            { "$abs": { "$subtract": [{ "$ifNull": ["$alarmClearedTime", now] },"$alarmReportingTime"] }},
                                            60000
                                        ]}
                                    },
                                    10
                                ]},
                                # Si los minutos son menores que 10, agrega un 0 delante
                                { "$concat": [
                                    "",
                                    { "$toString": {
                                        "$floor": {
                                            "$divide": [
                                                { "$abs": { "$subtract": [{ "$ifNull": ["$alarmClearedTime", now] },"$alarmReportingTime"] }},
                                                60000
                                            ]
                                        }
                                    }}
                                ]},
                                # Si no, usa el valor tal cual
                                { "$toString": {
                                    "$floor": {
                                        "$divide": [
                                            { "$abs": { "$subtract": [{ "$ifNull": ["$alarmClearedTime", now] },"$alarmReportingTime"] }},
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
                                                { "$abs": { "$subtract": [{ "$ifNull": ["$alarmClearedTime", now] },"$alarmReportingTime"] }},
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
                                                    { "$abs": { "$subtract": [{ "$ifNull": ["$alarmClearedTime", now] },"$alarmReportingTime"] }},
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
                                                { "$abs": { "$subtract": [{ "$ifNull": ["$alarmClearedTime", now] },"$alarmReportingTime"] }},
                                                1000
                                            ]}
                                        },
                                        60
                                    ]
                                }}
                            ]
                        },
                        "min"
                    ]
                }
            
             }
        )

        
        
        alarmas_actualizadas = []
        for alarma in cursor:

            alarm_id = alarma.get("alarmId", "")
            origen_id = alarma.get("origenId", "")

            # Verificar si alarmId es igual a origenId
            if alarm_id == origen_id:
                origen_id_procesado = "-"
            else:
                origen_id_procesado = procesar_origen_id(origen_id)

            alarma['_id'] = convert_object_ids(alarma.get('_id'))
            alarma['alarmClearedTime'] = format_datetime_UPD(alarma.get('alarmClearedTime'))
            alarma['origenId'] =  origen_id_procesado,
            alarma['timeDiffRep'] = alarma.get("timeDiffRep"),
            alarma['alarmState'] = alarma.get('alarmState', '-')

            alarmas_actualizadas.append(alarma)

        #alarmas_actualizadas = convert_object_ids(alarmas_actualizadas)  # Convertimos los ObjectId a string
        return jsonify({
            "data": alarmas_actualizadas
        }), 200

    except Exception as e:
        logger.error(f"Error en /update_visible_alarms: {str(e)}", exc_info=True)
        return jsonify({"error": "Ocurrió un error al actualizar las alarmas"}), 500

##########


##########
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
    df = df[['alarmId', 'alarmState', 'alarmType', 'inicioOUM', 'alarmRaisedTime', 'alarmReportingTime', 'timeDifference', 'timeDifferenceIncident', 'alarmClearedTime',
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

#/****************************/

def get_incident_by_externalrecid(externalrecid):
    """
    Retorna el documento más reciente (ordenado por _id desc) de 'workorder-read'
    cuyo campo 'externalrecid' coincida con el valor proporcionado.
    Devuelve None si no existe ningún documento que cumpla la condición.
        Ticket ICD: externalId
        Fecha de creación de OT: creationDate
        nro de OT: id
        fecha cierre OT: timeOccurred

    Parámetros:
        externalrecid (str): El valor de externalrecid a buscar.
    """
    try:
        # Primera consulta: Obtener el incidente más reciente
        incident_query = {
            "isglobal": True,  # Cambiado a booleano en lugar de string "true"
            "ticketid": externalrecid
        }
        incident = mongo.db['incident-read'].find_one(
            incident_query,
            sort=[("_id", -1)]
        )

        if not incident:
            #logger.info(f"No se encontró ningún incidente con ticketid: {externalrecid}")
            return None

        # Extraer los nro_ot del campo workorder
        nro_ots = [ot['nro_ot'] for ot in incident.get('workorder', [])]

        if not nro_ots:
            #logger.info(f"No se encontraron workorders asociadas al incidente: {externalrecid}")
            return None

        # Segunda consulta: Obtener la workorder más reciente
        workorder_query = {
            "event.workOrder.externalId": {"$in": nro_ots}
        }
        workorder = mongo.db['workorder-read'].find_one(
            workorder_query,
            projection={
                "_id": 0,
                "fechaIniciaOT": "$event.workOrder.creationDate",
                "fechaFinOT": "$event.workOrder.timeOccurred",
                "fechalastUpdate": "$event.workOrder.lastUpdate",
                "id": "$event.workOrder.id",
                "workOrderId": "$event.workOrder.externalId"
            },
            sort=[("event.workOrder.lastUpdate", -1)]
        )

        if workorder:
            #logger.info(f"Workorder encontrada para el incidente: {workorder}")
            return workorder
        else:
            #logger.info(f"No se encontró ninguna workorder asociada a los nro_ot: {nro_ots}")
            return None

    except Exception as e:
        logger.error(f"Error al buscar workorder por externalrecid (ICD{externalrecid}): {str(e)}", exc_info=True)
        return None


#/****************************/

def get_alarmIncident(idOutage):
    """
    Retorna la fecha de envio de ICD al topic 
    """
    try:

        idOutage = str(idOutage)
        # Construye el filtro
        query = {
            "idOutage": idOutage
        }

        # Obtiene el conteo de documentos que coinciden
        #count = mongo.db['alarmIncident'].count_documents(query)
        

        # Realiza la consulta con find_one y sort por _id para obtener el último registro
        doc = mongo.db['alarmIncident'].find_one(
            query,
            sort=[("_id", -1)]
        )

        # Si se encontró un documento, convertimos el _id a string (opcional)
        if doc:
            doc["_id"] = idOutage

        #print(f'count: {count} idOutage: {idOutage} ')

        return doc
    
    except Exception as e:
        logger.error(f"Error al buscar alarmIncident ({idOutage}): {str(e)}", exc_info=True)
        return None


def pad_zero(n):
    """Devuelve el número formateado con dos dígitos."""
    return f"{n:02d}"

def formatear_diferencia(alarm_raised_time, alarm_incident_time):
    """
    Calcula y formatea la diferencia entre alarm_raised_time y alarm_incident_time.
    
    :param alarm_raised_time: fecha y hora de inicio (puede ser str o datetime)
    :param alarm_incident_time: fecha y hora de final (puede ser str o datetime)
    :return: cadena formateada en 'MM:SS' o solo 'M' si los minutos superan 99.
    """
    
    # Si las fechas vienen como cadenas, se pueden convertir a objetos datetime.
    # Es necesario conocer el formato de las cadenas. Ejemplo: '%Y-%m-%d %H:%M:%S'
    formato_fecha = '%Y-%m-%d %H:%M:%S'  # Ajustar según el formato real
    
    if isinstance(alarm_raised_time, str):
        alarm_raised_time = datetime.strptime(alarm_raised_time, formato_fecha)
    if isinstance(alarm_incident_time, str):
        alarm_incident_time = datetime.strptime(alarm_incident_time, formato_fecha)
    
    # Calcula la diferencia en segundos.
    # Se asume que alarm_incident_time es la fecha actual o posterior a alarm_raised_time.
    diferencia = alarm_incident_time - alarm_raised_time
    diff_ms = diferencia.total_seconds()  # diferencia en segundos
    
    # Si la diferencia es negativa, asumimos que la hora está en el futuro y devolvemos '0:00 min'
    if diff_ms < 0:
        return '0:00min'
    
    diff_total_seconds = int(diff_ms)
    minutes = diff_total_seconds // 60
    seconds = diff_total_seconds % 60
    
    if minutes > 99:
        formatted_time = f"{minutes}"
    else:
        formatted_time = f"{minutes}:{pad_zero(seconds)}"
    
    return f"{formatted_time}min"




def formatear_diferenciaOT(alarm_incident_time, fecha_inicia_ot):
    """
    Calcula y formatea la diferencia entre alarm_incident_time y fecha_inicia_ot.
    
    :param alarm_incident_time: fecha y hora del incidente (puede ser str o datetime)
    :param fecha_inicia_ot: fecha y hora de inicio de la OT (puede ser str o datetime)
    :return: cadena formateada en 'MM:SS' o solo 'M' si los minutos superan 99.
    """
    # Parsear las fechas si son strings
    if isinstance(alarm_incident_time, str):
        # Si no tiene timezone, asumir que está en UTC
        if 'T' in alarm_incident_time:
            alarm_incident_time = parser.isoparse(alarm_incident_time)
        else:
            alarm_incident_time = datetime.strptime(alarm_incident_time, '%Y-%m-%d %H:%M:%S').replace(tzinfo=tz.UTC)
    
    if isinstance(fecha_inicia_ot, str):
        fecha_inicia_ot = parser.isoparse(fecha_inicia_ot)
    
    # Asegurar que ambas fechas sean timezone-aware
    if alarm_incident_time.tzinfo is None:
        alarm_incident_time = alarm_incident_time.replace(tzinfo=tz.UTC)
    if fecha_inicia_ot.tzinfo is None:
        fecha_inicia_ot = fecha_inicia_ot.replace(tzinfo=tz.UTC)
    
    # Convertir ambas fechas a UTC para evitar problemas con zonas horarias
    alarm_incident_time = alarm_incident_time.astimezone(tz.UTC)
    fecha_inicia_ot = fecha_inicia_ot.astimezone(tz.UTC)
    
    
    # Calcular la diferencia en segundos
    diferencia = fecha_inicia_ot - alarm_incident_time 
    diff_seconds = diferencia.total_seconds()
    
    # Si la diferencia es negativa, devolver '0:00 min'
    if diff_seconds < 0:
        return '0:00min'
    
    # Formatear la diferencia en minutos y segundos
    diff_total_seconds = int(diff_seconds)
    minutes = diff_total_seconds // 60
    seconds = diff_total_seconds % 60
    
    if minutes > 99:
        formatted_time = f"{minutes}"
    else:
        formatted_time = f"{minutes}:{pad_zeroOT(seconds)}"
    
    return f"{formatted_time}min"

def pad_zeroOT(number):
    """Asegura que un número tenga al menos dos dígitos, añadiendo un cero si es necesario."""
    return f"{number:02d}"


############################


# Nueva ruta para obtener las alarmas en formato JSON para Bonelli
@app.route('/get_raised_all_alarms', methods=['GET'])
def get_raised_all_alarms():
    # Obtener la IP del cliente
    if request.headers.get('X-Forwarded-For'):
        client_ip = request.headers.get('X-Forwarded-For').split(',')[0].strip()
    else:
        client_ip = request.remote_addr

    client_user = request.remote_user
    logger.info(f"IP: {client_ip} User: {client_user} - /get_raised_all_alarms. Solicitud de Bonelli")

    # Calcular la fecha límite para alarmas CLEARED
    days_ago = datetime.now(buenos_aires_tz) - timedelta(days=days_configMap)
    #logger.info(f"Consultando alarmas desde {days_ago}.")

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
        '5': 'alarmReportingTime',
        '7': 'omArrivalTimestamp',
        '13': 'alarmClearedTime',                    
        '15': 'TypeNetworkElement',
        '16': 'networkElementId',
        '17': 'clients',
        '18': 'timeResolution',
        '19': 'sequence',
        '20': 'plays'
    }

    # Determinar el campo de ordenamiento y la dirección
    sort_field = column_mapping.get(order_column_index, 'omArrivalTimestamp')
    sort_direction = ASCENDING if order_direction.lower() == 'asc' else DESCENDING
    #sort_direction = DESCENDING if order_direction.lower() == 'desc' else ASCENDING

    logger.info(f"Sorting by: {sort_field} {order_direction}, search[value]='{search_value}'")

    # Calcula la hora actual en Python
    now = datetime.utcnow()

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
                {"alarmIncidentTime": search_regex},
                {"alarmClearedTime": search_regex},
                {"alarmReportingTime": search_regex},
                {"networkElement.type": search_regex},   
                {"timeResolution": search_regex},
                {"sequence": search_regex},
                {"plays": search_regex}
            ]
        }

    # Construir el filtro principal excluyendo 'DAMAGED'
    query_filter = {
        "$or": [
            {"alarmState": {"$in": ['RAISED', 'UPDATED', 'RETRY']}}
            #,{"alarmState": "CLEARED", "alarmClearedTime": {"$gte": days_ago}}
        ]
    }

    query_filter_full = {
        "$or": [
            {"alarmState": {"$in": ['RAISED', 'UPDATED', 'RETRY', 'CLEARED']}}
        ]
    }

    # Combinar con el filtro de búsqueda si existe, quita el limite de days_ago !!!
    if search_filter:
        query_filter = {"$and": [query_filter, search_filter]}  #limita a days_ago
        #query_filter = {"$and": [query_filter_full, search_filter]} #quita el limite de days_ago !!!

    #logger.info(f"query_filter: {query_filter}")


    # Construir el pipeline de agregación
    pipeline = [
        {
            "$match": query_filter
        },
        {
            "$sort": {sort_field: 1} if sort_direction == ASCENDING else {sort_field: -1}
        },
        {
            "$project": {
                "_id": 1,
                "outageId": 1,
                "alarmId": 1,
                "alarmType": 1,
                "alarmState": 1,  # Campo actualizado
                "clients": 1,
                "typeNetworkElement": "$networkElement.type",
                "networkElementId": 1,
                "timeResolution": 1,
                "sourceSystemId": 1,
                "origenId": 1,
                #"inicioOUM": "$omArrivalTimestamp",
                "omArrivalTimestamp": 1,
                "alarmRaisedTime": 1,
                "alarmClearedTime": 1,
                "alarmReportingTime": 1,
                "sequence": 1,
                "plays": 1

            }
        }
    ]

    #logger.info(f"pipeline: {pipeline}")

    # Ejecutar el pipeline de agregación
    cursor = mongo.db.alarm.aggregate(pipeline)

    alarmas = []
    for alarma in cursor:

        def format_date_full(dt):
            if dt:
                if isinstance(dt, str):
                    try:
                        # Intenta analizar la cadena a un objeto datetime
                        dt = parser.isoparse(dt)
                    except ValueError:
                        logger.error(f"Formato de fecha inválido: {dt}")
                        return '-'
                if isinstance(dt, datetime):
                    # Asegúrate de que el objeto datetime sea consciente de la zona horaria
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezoneZ.utc)
                    # Formatear en ISO 8601 con 'Z' al final
                    return dt.isoformat(timespec='seconds').replace('+00:00', 'Z')
                else:
                    logger.error(f"Tipo de dato inesperado para fecha: {type(dt)}")
                    return '-'
            else:
                return '-'

        alarma['omArrivalTimestamp'] = format_date_full(alarma.get('omArrivalTimestamp'))
        alarma['alarmRaisedTime'] = format_date_full(alarma.get('alarmRaisedTime'))
        alarma['alarmClearedTime'] = format_date_full(alarma.get('alarmClearedTime'))
        alarma['alarmReportingTime'] = format_date_full(alarma.get('alarmReportingTime'))

        
        
                    
        alarma['_id'] = convert_object_ids(alarma.get('_id'))




        alarmas.append(alarma)

    # Contar el total de documentos que coinciden con el filtro (sin paginación)
    total_count = mongo.db.alarm.count_documents(query_filter)

    logger.info(f"Se encontraron {len(alarmas)} alarmas")
    logger.info(f"-------------------------------------------------")

    return jsonify({
        "draw": int(request.args.get('draw', 1)),
        "recordsTotal": total_count,
        "recordsFiltered": total_count,
        "data": alarmas
    })


############################



if __name__ == '__main__':
    port = os.environ.get('FLASK_PORT') or 8080
    logger.info(f"Iniciando la aplicación en el puerto {port}.")
    app.run(port=int(port), host='0.0.0.0')

