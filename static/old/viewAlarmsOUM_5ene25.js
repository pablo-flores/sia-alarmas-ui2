/*******************************************************************************/

// Función auxiliar para obtener todas las alarmas manejando la paginación
async function fetchAllAlarms() {
    let allData = [];
    let page = 1;
    const limit = 1000; // Número de elementos por página; ajusta según sea necesario
    let total = 0;

    try {
        while (true) {
            const response = await fetch(`/get_alarmas?page=${page}&limit=${limit}`);
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            allData = allData.concat(data.data);
            total = data.recordsTotal;

            if (allData.length >= total) {
                break;
            }

            page++;
        }
        return allData;
    } catch (error) {
        console.error('Error al obtener todas las alarmas:', error);
        throw error;
    }
}

/*******************************************************************************/

// Evento de descarga de Excel
document.getElementById('download-excel').addEventListener('click', async function () {
    try {
        // Mostrar mensaje de carga
        document.getElementById('loading-message').style.display = 'block';

        // Obtener todas las alarmas
        const allAlarms = await fetchAllAlarms();

        // Preparar las filas para Excel
        const rows = [];

        // Añadir encabezados (ajusta según tus columnas)
        const headers = [
            "alarmId",
            "origenId",
            "alarmState",
            "alarmType",
            "alarmRaisedTime",
            "alarmReportingTime",
            "timeDifferenceIncident",
            "inicioOUM",
            "timeDifference",
            "alarmClearedTime",
            "timeDiffRep",            
            "TypeNetworkElement",
            "networkElementId",
            "clients",
            "timeResolution",
            "plays",
            "sequence"
        ];
        rows.push(headers);

        // Añadir datos
        allAlarms.forEach(alarm => {
            const row = [
                alarm.alarmId,
                alarm.origenId,
                alarm.alarmState,
                alarm.alarmType,
                alarm.alarmRaisedTime,
                alarm.alarmReportingTime,
                alarm.timeDifferenceIncident,
                alarm.inicioOUM,
                alarm.timeDifference,
                alarm.alarmClearedTime, 
                alarm.timeDiffRep,
                alarm.TypeNetworkElement,
                alarm.networkElementId,
                alarm.clients,
                alarm.timeResolution,
                alarm.sequence !== undefined ? alarm.sequence : '-'
            ];
            rows.push(row);
        });

        // Crear la hoja de trabajo
        const worksheet = XLSX.utils.aoa_to_sheet(rows);

        // Crear el libro de trabajo
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Alarmas");

        // Generar el archivo Excel
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

        // Crear el Blob para el archivo Excel
        const excelFile = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const downloadLink = document.createElement("a");
        downloadLink.download = 'SIA_alarmas_' + new Date().toISOString().slice(0, 19).replace(/:/g, "-") + '.xlsx';
        downloadLink.href = URL.createObjectURL(excelFile);
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

    } catch (error) {
        alert('Ocurrió un error al descargar el archivo Excel.');
    } finally {
        // Restaurar el estado de carga
        document.getElementById('loading-message').style.display = 'none';
    }
});

/*******************************************************************************/

// Evento de descarga de CSV
document.getElementById('download-csv').addEventListener('click', async function () {
    try {
        // Mostrar mensaje de carga
        document.getElementById('loading-message').style.display = 'block';

        // Obtener todas las alarmas
        const allAlarms = await fetchAllAlarms();

        // Inicializar el array para almacenar las filas CSV
        const csv = [];

        // Añadir encabezados (ajusta según tus columnas)
        const headers = [
            "alarmId",
            "origenId",
            "alarmState",
            "alarmType",
            "alarmRaisedTime",
            "alarmReportingTime",
            "timeDifferenceIncident",
            "inicioOUM",
            "timeDifference",
            "alarmClearedTime",
            "timeDiffRep",            
            "TypeNetworkElement",
            "networkElementId",
            "clients",
            "timeResolution",
            "plays",
            "sequence"
        ];
        csv.push(headers.join(","));

        // Añadir datos
        allAlarms.forEach(alarm => {
            const row = [
                `"${alarm.alarmId}"`,
                `"${alarm.origenId}"`,
                `"${alarm.alarmState}"`,
                `"${alarm.alarmType}"`,
                `"${alarm.alarmRaisedTime}"`,
                `"${alarm.alarmReportingTime}"`,
                `"${alarm.timeDifferenceIncident}"`,                
                `"${alarm.inicioOUM}"`,
                `"${alarm.timeDifference}"`,
                `"${alarm.alarmClearedTime}"`, 
                `"${alarm.timeDiffRep}"`,                 
                `"${alarm.TypeNetworkElement}"`,
                `"${alarm.networkElementId}"`,
                `"${alarm.clients}"`,
                `"${alarm.timeResolution}"`,
                `"${alarm.plays !== undefined ? alarm.plays : '-'}"`,
                `"${alarm.sequence !== undefined ? alarm.sequence : '-'}"`
            ];
            csv.push(row.join(","));
        });

        // Crear el archivo CSV
        const csvFile = new Blob([csv.join("\n")], { type: "text/csv" });
        const downloadLink = document.createElement("a");
        downloadLink.download = 'SIA_alarmas_' + new Date().toISOString().slice(0, 19).replace(/:/g, "-") + '.csv';
        downloadLink.href = window.URL.createObjectURL(csvFile);
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

    } catch (error) {
        alert('Ocurrió un error al descargar el archivo CSV.');
    } finally {
        // Restaurar el estado de carga
        document.getElementById('loading-message').style.display = 'none';
    }
});

/*******************************************************************************/

// Atajos de teclado para descargar Excel (Ctrl + E) y CSV (Ctrl + I)
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && (event.key === 'e' || event.key === 'E')) {
        event.preventDefault();
        document.getElementById('download-excel').click();
    }
    if (event.ctrlKey && (event.key === 'i' || event.key === 'I')) {
        event.preventDefault();
        document.getElementById('download-csv').click();
    }
    if (event.ctrlKey && (event.key === 'm' || event.key === 'M')) {
        event.preventDefault();
        // Redirigir a formTopologia3D.html usando la ruta del servidor

        //window.location.href = 'templates/formTopologia3D.html';
        window.location.href = 'templates/formTopologiaCliente.html';
    }
});


/*******************************************************************************/

// Extensión de orden personalizado para DataTables
$.fn.dataTable.ext.order['custom-num-sort'] = function(settings, colIdx) {
    return this.api().column(colIdx, { order: 'index' }).nodes().map(function(td) {
        return parseFloat($(td).text().replace(/[^0-9.-]/g, '')) || 0;
    });
};

/*******************************************************************************/

// Función para procesar cadenas para visualización
function processStringForDisplay(data) {
    return data ? data.trim() + ' (processed)' : '';
}

/*******************************************************************************/


/*******************************************************************************/

// Declarar 'table' en el ámbito global
var table;
var autoRefreshInterval; // Variable para almacenar el ID del intervalo
var visibleRowsRefreshInterval;

// Array global donde guardaremos todos los IDs que ya se hayan mostrado en la tabla
let existingAlarmIds = [];
// Array para almacenar los nuevos IDs detectados durante cada carga
let highlightAlarmIds = [];
let initialLoad = true;  // <-- nueva bandera
let TIME_RELOAD = 5000
let TIME_VER_CELDA = 30000
let TIME_INTER_CELDA = 3000

// Objeto donde guardamos el estado previo de cada fila, 
// usando como clave el _id de la alarma.
let oldDataById = {};

// Objeto donde marcaremos las celdas actualizadas en cada refresh global.
// La idea es: updatedCells[idAlarma] = [ array de nombres de campos que cambiaron ]
let updatedCells = {};

// Índices de columnas que NO se deben resaltar (por ejemplo, la 10).
// Nota: la columna 10 en DataTables es la que corresponde a timeDiffRep en tu ejemplo.
const excludedColumnIndexes = [10];

// Objeto donde guardaremos qué celdas deben seguir en color
// highlightState[ alarmId ] = { 
//    colIndex1: expirationTime, 
//    colIndex2: expirationTime, ...
// }
let highlightState = {};


/**
 * Mapeo de nombres de campos de la alarma => índice de columna en DataTables.
 * Ajusta según tus columnas reales:
 */
const fieldToColumnIndex = {
  "alarmId": 0,
  "origenId": 1,
  "alarmState": 2,
  "alarmType": 3,
  "alarmRaisedTime": 4,
  "alarmReportingTime": 5,
  "timeDifferenceIncident": 6,
  "inicioOUM": 7,
  "timeDifference": 8,
  "alarmClearedTime": 9,
  "timeDiffRep": 10,            // Excluida del resaltado
  "TypeNetworkElement": 11,
  "networkElementId": 12,
  "clients": 13,
  "timeResolution": 14,
  "plays": 15,
  "sequence": 16
};





// Inicialización de DataTable con procesamiento del lado del servidor
$(document).ready(function() {
    $('#loading').show();
    $('#alarmTable').hide();

    table = $('#alarmTable').DataTable({
        "rowId": '_id',
        "serverSide": true,
        "ajax": {
            "url": "/get_alarmas",
            "type": "GET",
            "error": function (xhr, error, thrown) {
                console.error("Error de DataTables:", error);
                console.log("Respuesta del servidor:", xhr.responseText); 
                alert("Ocurrió un error al cargar los datos de la tabla:\n" + error + "\nRespuesta del servidor:\n" + xhr.responseText);                
            },
            "data": function(d) {
                // Ajustamos page y limit. “baseLimit + pendingExpansion” es el total
                d.page = Math.floor(d.start / d.length) + 1;
                d.limit = d.length;
                d.search = { "value": d.search.value };

                // NUEVO (expansión): forzamos “limit = baseLimit + pendingExpansion”
                //d.limit = baseLimit + pendingExpansion;
            },
            "dataSrc": function (json) {
                //console.log('Datos recibidos desde server:', json.data);
                if (json.error) {
                    console.error("Error desde el servidor:", json.error);
                    alert("Hubo un error en el servidor: " + json.error);
                    return [];
                }
                
           
                // -----------------------------------------------------------------
                // detectar cuáles son los IDs que aún no tenemos almacenados
                // -----------------------------------------------------------------
                const newData = json.data;
                
                // Si es la primera carga, se llenan los existingAlarmIds
                // pero no se resalta nada:
                // -------------------------------------
                // 1) Detectar filas nuevas (ya lo haces)
                // -------------------------------------
                if (initialLoad) {
                    newData.forEach(alarm => {
                        existingAlarmIds.push(alarm._id);
                    });
                    initialLoad = false;
                } else {
                    highlightAlarmIds = [];
                    newData.forEach(alarm => {
                        if (!existingAlarmIds.includes(alarm._id)) {
                            highlightAlarmIds.push(alarm._id);
                        }                       
                    });
                    existingAlarmIds = existingAlarmIds.concat(highlightAlarmIds);
                }

                // ----------------------------------------------------------------------------
                // 2) Detectar celdas que cambiaron para cada fila, comparando con `oldDataById`
                // ----------------------------------------------------------------------------
                updatedCells = {};  // Reiniciamos en cada refresh global

                newData.forEach( alarm => {
                    const alarmId = alarm._id;

                    // Ver si existe en oldDataById => significa fila conocida
                    if (oldDataById[alarmId]) {
                        // Comparar campo por campo:
                        const oldRow = oldDataById[alarmId];
                        const newRow = alarm;

                        // Recorremos las keys que te interesan:
                        Object.keys(fieldToColumnIndex).forEach( campo => {
                            // Saltar la comparación en la columna 10 (timeDiffRep)
                            if (fieldToColumnIndex[campo] === 10) {
                                return; 
                            }
                            const oldVal = (oldRow[campo] ?? '').toString().trim();
                            const newVal = (newRow[campo] ?? '').toString().trim();
                            if ( oldVal !== newVal ) {
                                // Si son diferentes, lo marcamos
                                if (!updatedCells[alarmId]) {
                                    updatedCells[alarmId] = [];
                                }
                                updatedCells[alarmId].push(campo);
                            }
                        });

                    } 
                    
                    // Guardar la versión nueva de la alarma en oldDataById
                    oldDataById[alarmId] = alarm;
                });

                // Retornamos la data para que DataTables pinte las filas
                return newData;

            },
            "error": function (xhr, error, thrown) {
                console.error("Error de DataTables:", error);
                console.log("Respuesta del servidor:", xhr.responseText); 
                alert("Ocurrió un error al cargar los datos de la tabla:\n" + error + "\nRespuesta del servidor:\n" + xhr.responseText);                
            }
        },
        "columns": [
            { "data": "alarmId" },
            { "data": "origenId" },
            { "data": "alarmState" },
            { "data": "alarmType" },
            { "data": "alarmRaisedTime" },
            { "data": "alarmReportingTime" },
            { "data": "timeDifferenceIncident" },                                    
            { "data": "inicioOUM" },
            { "data": "timeDifference" },
            { "data": "alarmClearedTime" }, 
            { "data": "timeDiffRep" },             
            { "data": "TypeNetworkElement" },
            { "data": "networkElementId" },
            { "data": "clients" },
            { "data": "timeResolution" },
            { "data": "plays", "visible": false },
            { "data": "sequence", "visible": false },
            { "data": "alarmReportingTimeFull", "visible": false },
            { "data": "_id", "visible": false },  // Incluir pero no mostrar      
        ],
        "autoWidth": true,
        "paging": true,
        "searching": true,
        "ordering": true,
        "order": [],
        "processing": true,
        "pageLength": 15,
        "lengthMenu": [ [10, 15, 25, 50, 100, 300, 1000], [10, 15, 25, 50, 100, 300, 1000] ],
        "columnDefs": [
            {
                "targets": 10, // Índice de la nueva columna "T-to Repar"
                "render": function(data, type, row) {
                    if (type === 'display') {

                        //console.log('Rendering T-to Repar for row:', row);

                        //console.log('Rendering T-to Repar for row:', row.alarmClearedTime);
                        const alarmClearedTime = row.alarmClearedTime;
                        //console.log('Rendering T-to Repar for row:', alarmClearedTime);

                        if (alarmClearedTime && alarmClearedTime !== '-') {
                            if (data.length > 9) {
                                data = data.split(':')[0] + ' min';
                            }
                            const style = data.includes('-') ? 'color: red; font-weight: bold;' : '';
                            //console.log('Rendering T-to Repar for data:', data);

                            return `<div style="font-size: 0.7vw; white-space: wrap; word-break: normal; text-align: right; ${style}">${data}</div>`;
                        }
                        else {
                            
                            const alarmReportingTimeFull = row.alarmReportingTimeFull;
                            if (alarmReportingTimeFull && alarmReportingTimeFull !== '-') {
                                // Limpiar corchetes si existen en 'data'
                                let cleanedData = data;
                                if (Array.isArray(cleanedData)) {
                                    cleanedData = cleanedData.join(''); // Convierte array a string
                                } else {
                                    cleanedData = cleanedData.replace(/[\[\]]/g, ''); // Elimina corchetes si están como string
                                }
                                
                                // Procesar 'data' si tiene más de 9 caracteres
                                if (cleanedData.length > 9) {
                                    cleanedData = cleanedData.split(':')[0] + ' min';
                                }
                                
                                const style = cleanedData.includes('-') ? 'color: red; font-weight: bold;' : '';
                                
                                //console.log('Rendering alarmReportingTimeFull T-to Repar for data:', cleanedData);
                                
                                return `<div class="t-to-repar" data-alarmreportingtime="${alarmReportingTimeFull}" style="font-size: 0.7vw; white-space: wrap; word-break: normal; text-align: right; ${style}">${cleanedData}</div>`;
                            } else {
                                return '-';
                            }
                        }

                    }
                    return data;

                }
            },            
            {
                "targets": 0, // alarmId
                "render": function(data, type, row) {
                    let alarmId = data ? data : '';
                    let cleanAlarmId = alarmId.length > 4 ? alarmId.substring(4).trim() : alarmId.trim();
                    let sequence = (row.sequence !== undefined && row.sequence !== null) ? row.sequence : '-';

                    let sequenceDisplay;
                    if (typeof sequence === 'number' && sequence > 4) {
                        sequenceDisplay = `<span style="color: red; font-weight: bold;">${sequence}</span>`;
                    } else if (typeof sequence === 'number') {
                        sequenceDisplay = sequence;
                    } else {
                        sequenceDisplay = '-';
                    }

                    if (type === 'display') {
                        return `
                            <div class="tooltip-cell" style="text-align: left;" data-alarmid="${cleanAlarmId}">
                                ${alarmId}
                                <span class="tooltip-text">                           
                                    <div class="tooltip-row">
                                        <span class="tooltip-title">Origen:</span>
                                        <span class="tooltip-value">${(row.sourceSystemId || '').split('').join(' ')}</span>
                                    </div>
                                    <div class="tooltip-row">
                                        <span class="tooltip-title">Deteccion:</span>
                                        <span class="tooltip-value">${row.alarmRaisedTime || '-'}</span>
                                    </div>
                                    <div class="tooltip-row">
                                        <span class="tooltip-title">Reporte:</span>
                                        <span class="tooltip-value">${row.alarmReportingTime || '-'}</span>
                                    </div>
                                    <div class="tooltip-row">
                                        <span class="tooltip-title">Arribo Outage:</span>
                                        <span class="tooltip-value">${row.inicioOUM || '-'}</span>
                                    </div>
                                    <div class="tooltip-row">
                                        <span class="tooltip-title">Resuelto:</span>
                                        <span class="tooltip-value">${row.alarmClearedTime || '-'}</span>
                                    </div>
                                    <div class="tooltip-row">
                                        <span class="tooltip-title">Sequence:</span>
                                        <span class="tooltip-value">${sequenceDisplay}</span>
                                    </div>                                  
                                </span>
                            </div>`;
                    }
                    return alarmId;
                }
            },          
            {
                "targets": 1, // origenId
                "render": function (data, type, row) {
                    //const cssClass = data === '-' ? 'text-center' : 'text-left';
                    const cssClass = data === '-' ? 'text-center origenId' : 'text-left origenId';
                    return `<div class="${cssClass}">${data}</div>`;
                }
            },
            {
                "targets": 2, // alarmState
                "orderable": true,
                "render": function(data, type, row) {
                    let alarmState = data;
                    if (row.alarmClearedTime !== '-') {
                        alarmState = 'CLEARED';
                    }                    
            
                    if (type === 'display') {
                        return `<div style="text-align: left;">${alarmState}</div>`;
                    } else if (type === 'sort') {
                        return data;
                    }
                    
                    return alarmState;
                }
            },
            {
                "targets": 3, // alarmType
                "render": function(data, type, row) {
                    let displayValue = data;
                    switch(data) {
                        case 'INDISPONIBILIDAD':
                            displayValue = 'INDISP';
                            break;
                        case 'DEGRADACION':
                            displayValue = 'DEGRAD';
                            break;
                        case 'TAREA_PROGRAMADA_CON_AFECTACION_DE_SERVICIO':
                            displayValue = 'TAREA_CAF';
                            break;
                        case 'TAREA_PROGRAMADA_SIN_AFECTACION_DE_SERVICIO':
                            displayValue = 'TAREA_SAF';
                            break;
                    }

                    

                    if (type === 'display') {
                        return `
                            <div class="tooltip-cell" style="text-align: left;" data-alarmid="${displayValue}">
                                ${displayValue}
                                <span class="tooltip-text">                           
                                    <div class="tooltip-row">
                                        <span class="tooltip-title">Tipo Incidente:</span>
                                        <span class="tooltip-value">${data}</span>
                                    </div>                                 
                                </span>
                            </div>`;
                    }
                    return data;
                }
            },            
            {
                "targets": 4, // alarmRaisedTime
                "render": function (data) {
                    return `<div style="text-align: center;">${data}</div>`;
                }
            },
            {
                "targets": 5, // alarmReportingTime
                "render": function (data) {
                    return `<div style="text-align: center;">${data}</div>`;
                }
            },            
            {
                "targets": 6, // timeDifferenceIncident
                "type": "num",
                "orderable": true,
                "render": function(data, type) {
                    if (type === 'display') {
                        if (data.length > 9) {
                            data = data.split(':')[0] + ' min';
                        }
                        const style = data.includes('-') ? 'color: red; font-weight: bold;' : '';
                        return `<div style="font-size: 0.7vw; white-space: wrap; word-break: normal; text-align: right; ${style}">${data}</div>`;
                    }
                    return data;
                },
                "orderDataType": "custom-num-sort"
            },             
            {
                "targets": 7, // inicioOUM
                "render": function (data) {
                    return `<div style="text-align: center;">${data}</div>`;
                }
            },
            {
                "targets": 8, // timeDifference
                "type": "num",
                "orderable": true,
                "render": function(data, type) {
                    if (type === 'display') {   
                        if (data.length > 9) {
                            data = data.split(':')[0] + ' min';
                        }
                        const style = data.includes('-') ? 'color: red; font-weight: bold;' : '';
                        //return `<div style="font-size: 0.7vw; white-space: wrap; word-break: normal; text-align: right;">${data}</div>`;
                        return `<div style="font-size: 0.7vw; white-space: wrap; word-break: normal; text-align: right; ${style}">${data}</div>`;
                    }
                    return data;
                },
                "orderDataType": "custom-num-sort"
            },                          
            {
                "targets": 9, // alarmClearedTime
                "render": function (data, type) {
                    if (type === 'display') {
                        //return `<div style="text-align: center;">${data}</div>`;
                        return `<div class="text-center alarmClearedTime">${data}</div>`;
                    }
                    return data;
                }
            },   
                                                                      
            {
                "targets": 11, // TypeNetworkElement
                "render": function (data) {
                    return `<div style="text-align: left;">${data}</div>`;
                }
            },

            {
                "targets": 12, // Ahora corresponde a "plays"
                "render": function(data, type, row) {
                    if (type === 'display') {
                        // Verificar si 'plays' existe y es un array

                        if (Array.isArray(row.plays)) {
                            // Formatear cada objeto dentro del array 'plays'
                            let formattedPlays = row.plays.map(item => {
                                // Obtener la clave y el valor de cada objeto
                                let key = Object.keys(item)[0];
                                let value = item[key];
                                //return `<strong>${value}</strong>&ensp&ensp&ensp${key}`;
                                return `<tr><td>${value}</td><td>${key}</td></tr>`;
                            }).join(''); // Unir con saltos de línea HTML
            
                            if (row.plays.length === 0) {formattedPlays='Sin información'}

                            // Retornar el HTML con el tooltip formateado
                            return `
                                <div class="tooltip-cell" style="text-align: left;" data-alarmid="${data}">${data}
                                    <div class="tooltip-text">
                                        <div class="tooltip-title">Cantidad de PLAYs afectados:</div>
                                        <table class="tooltip-table">
                                            <tbody>
                                                ${formattedPlays}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>`;
                        } else {
                            return `
                                <div class="tooltip-cell" style="text-align: left;" data-alarmid="${data}">${data}
                                    <div class="tooltip-text">
                                        <div class="tooltip-title">Cantidad de PLAYs afectados:</div>
                                        <table class="tooltip-table">
                                            <tbody>
                                                Sin información
                                            </tbody>
                                        </table>
                                    </div>
                                </div>`;
                        }
                    }
                    return data;
                }
            },
                       
            {
                "targets": 13, // clients
                "type": "num",
                "render": function (data, type, row) {

                    var displayData = (typeof data !== 'undefined' && data !== null) ? data : 0;

                    // Asegurar que displayData sea numérico
                    displayData = parseInt(displayData, 10);
                    if (isNaN(displayData)) {
                        displayData = 0;
                    }

                    return `<div style="text-align: right;">${displayData}</div>`;
                }
            },
            {
                "targets": 14, // timeResolution
                "type": "num",
                "render": function(data, type, row) {
                    if (type === 'sort' || type === 'type') {
                        return parseFloat(data) || 0;
                    }
                    return data !== undefined ? `<div style="text-align: right;">${data}</div>` : '';
                }
            },  
            {
                "targets": 15, // plays
                "type": "num",
                "render": function(data, type, row) {
                    if (type === 'sort' || type === 'type') {
                        return parseFloat(data) || 0;
                    }
                    return data !== undefined ? `<div style="text-align: right;">${data}</div>` : '';
                }
            }                      
        ],        
        "language": {
            "lengthMenu": "Mostrar _MENU_ entradas",
            "zeroRecords": "No se encontraron resultados",
            "info": "Mostrando _START_ a _END_ de _TOTAL_ entradas",
            "infoEmpty": "Mostrando 0 a 0 de 0 entradas",
            "infoFiltered": "(filtrado de _MAX_ entradas totales)",
            "search": "<sup style='color: red;'>*</sup>Buscar:",
            "paginate": {
                "first": "Primero",
                "last": "Último",
                "next": "Siguiente",
                "previous": "Anterior"
            },
            "loadingRecords": "Cargando...",
            //"processing": 'Procesando...',
            "emptyTable": "No hay datos disponibles en la tabla"
        },
        "drawCallback": function() {

            // Llamamos al API de DataTables
            const api = this.api();
            const now = Date.now();


            // -----------------------------------------------------------------
            // NUEVO: recorrer todas las filas y resaltar las que tengan ID nuevo
            // -----------------------------------------------------------------
            api.rows().every(function(rowIdx) {
                const rowData = this.data();  // Datos de la fila actual
                const rowNode = this.node();  // <tr> de la fila en el DOM

                // Si el _id de la fila está dentro de highlightAlarmIds, resaltar
                if (highlightAlarmIds.includes(rowData._id)) {
                    $(rowNode).addClass('highlight-new');                   
                }


            });

            // Ahora, también resaltar las celdas que hayan cambiado
            api.rows().every(function() {
                const rowData = this.data();
                const rowNode = this.node();
                const alarmId = rowData._id;

                // ¿Esta fila tiene campos actualizados?
                if (updatedCells[alarmId] && updatedCells[alarmId].length > 0) {
                    // Para cada campo modificado, buscar la columna y añadir la clase
                    updatedCells[alarmId].forEach(campo => {
                        const colIndex = fieldToColumnIndex[campo];

                        // Evitar problemas si el colIndex no existe
                        if (colIndex !== undefined) {
                            // Obtener la celda
                            const cellNode = api.cell(rowNode, colIndex).node();

                            // Agregar la clase, siempre y cuando no esté en la lista de exclusión
                            if (!excludedColumnIndexes.includes(colIndex)) {
                                $(cellNode).addClass('updated-cell');

                                // Remover de manera escalonada (ejemplo)
                                setTimeout(() => {
                                    $(cellNode).removeClass('updated-cell').addClass('updated-cell-medio');
                                    setTimeout(() => {
                                        $(cellNode).removeClass('updated-cell-medio').addClass('updated-cell-exit');
                                    }, TIME_INTER_CELDA);
                                    setTimeout(() => {
                                        $(cellNode).removeClass('fade-out');
                                    }, TIME_INTER_CELDA);
                                }, TIME_VER_CELDA);

                                // TAMBIÉN guardarlo en highlightState:
                                if (!highlightState[alarmId]) {
                                    highlightState[alarmId] = {};
                                }
                                // 30s de vigencia, ajusta a tu gusto
                                highlightState[alarmId][colIndex] = Date.now() + TIME_VER_CELDA;

                            }
                        }
                    });
                }
            });

         
            // Opcional: después de dibujar, podrías vaciar highlightAlarmIds
            // para evitar que las filas sigan marcadas en reloads inmediatos.
            // Pero si quieres que permanezcan resaltadas, déjalo comentado.

            highlightAlarmIds = [];


            // 2) Re-aplicar resaltado de celdas según highlightState
            api.rows().every(function() {
                const rowData = this.data();
                const rowNode = this.node();
                const alarmId = rowData._id;

                // Si no hay info en highlightState[alarmId], nada que hacer
                if (!highlightState[alarmId]) return;

                // Iterar sobre las columnas registradas
                for (let colIndex in highlightState[alarmId]) {
                    // ¿Sigue vigente el resaltado?
                    if (highlightState[alarmId][colIndex] > now) {
                        // Obtener la celda de DataTables
                        const cellNode = api.cell(rowNode, colIndex).node();
                        $(cellNode).addClass('updated-cell');
                    }
                }
            });

            // 3) Limpieza de caducados
            cleanupHighlightState();


            // Re-inicializar tooltips después de cada renderizado
            $('#alarmTable tbody').off('mouseenter', '.tooltip-cell').on('mouseenter', '.tooltip-cell', function() {
                var tooltip = $(this).find('.tooltip-text');
                tooltip.css('visibility', 'visible').css('opacity', '1');
            });

            $('#alarmTable tbody').off('mouseleave', '.tooltip-cell').on('mouseleave', '.tooltip-cell', function() {
                var tooltip = $(this).find('.tooltip-text');
                tooltip.css('visibility', 'hidden').css('opacity', '0');
            });
            $('.dataTables_processing').css({
                //'background-color': 'orange',     // Cambia este color
                'color': 'red',                // Color del texto
                //'padding': '5px',              // Opcional: espaciado
                'border-radius': '5px'          // Opcional: redondeo de bordes
            });
            // Reiniciar la barra de progreso
            resetProgressBar();
            updateLocalTime();
            // Actualizar "T-to Repar" al renderizar
            //updateTtoRepar();
        }
    });

    // Verificar que 'table' está correctamente inicializada
    console.log('DataTable initialized:', table);

    $('#loading').hide();
    $('#alarmTable').show();

    // Para limpiar elementos específicos del localStorage
    //localStorage.removeItem('autoRefreshEnabled');
    //localStorage.removeItem('visibleRowsAutoRefreshEnabled');

    // Para limpiar todo el localStorage
    //localStorage.clear();


    //console.log('----------------------avanza table---------------------');
    console.log('Estado de autoRefreshEnabled:', localStorage.getItem('autoRefreshEnabled'));
    console.log('Estado de visibleRowsAutoRefreshEnabled:', localStorage.getItem('visibleRowsAutoRefreshEnabled'));

    // Inicializar el estado de los toggles desde localStorage
    var autoRefreshToggle = $('#auto-refresh-toggle');
    var visibleRowsToggle = $('#visible-rows-refresh-toggle');

    var isAutoRefreshEnabled = localStorage.getItem('autoRefreshEnabled') === 'true';
    var isVisibleRowsAutoRefreshEnabled = localStorage.getItem('visibleRowsAutoRefreshEnabled') === 'true';

    // Establecer el estado inicial de los toggles
    autoRefreshToggle.prop('checked', isAutoRefreshEnabled);
    visibleRowsToggle.prop('checked', isVisibleRowsAutoRefreshEnabled);

    // Si visibleRowsAutoRefreshEnabled está activado, desactivar autoRefresh
    if (isVisibleRowsAutoRefreshEnabled) {
        autoRefreshToggle.prop('checked', false);
        localStorage.setItem('autoRefreshEnabled', false);
        visibleRowsToggle.prop('checked', true);
        startVisibleRowsAutoRefresh();
    } else {
        // Establecer el estado del autoRefreshToggle según localStorage
        autoRefreshToggle.prop('checked', isAutoRefreshEnabled);
        if (isAutoRefreshEnabled) {
            startAutoRefresh();
        }
    }

    // Manejar el evento de cambio del Toggle Switch para Auto-Refresh Completo
    autoRefreshToggle.on('change', function() {
        var isChecked = $(this).is(':checked');
        localStorage.setItem('autoRefreshEnabled', isChecked);
        if (isChecked) {
            // Desactivar el otro toggle si está activo
            if (visibleRowsToggle.is(':checked')) {
                visibleRowsToggle.prop('checked', false);
                localStorage.setItem('visibleRowsAutoRefreshEnabled', false);
                localStorage.setItem('autoRefreshEnabled', true);
                stopVisibleRowsAutoRefresh();
                console.log('Auto-refresh de filas visibles deshabilitado por exclusividad.');
            }
            startAutoRefresh();
            console.log('Auto-refresh completo habilitado.');
        } else {
            stopAutoRefresh();
            console.log('Auto-refresh completo deshabilitado.');
        }
    });

    // Manejar el evento de cambio del Toggle Switch para Auto-Refresh de Filas Visibles
    visibleRowsToggle.on('change', function() {
        var isChecked = $(this).is(':checked');
        localStorage.setItem('visibleRowsAutoRefreshEnabled', isChecked);
        if (isChecked) {
            // Desactivar el otro toggle si está activo
            if (autoRefreshToggle.is(':checked')) {
                autoRefreshToggle.prop('checked', false);
                localStorage.setItem('visibleRowsAutoRefreshEnabled', true);
                localStorage.setItem('autoRefreshEnabled', false);
                stopAutoRefresh();
                console.log('Auto-refresh completo deshabilitado por exclusividad.');
            }
            startVisibleRowsAutoRefresh();
            console.log('Auto-refresh de filas visibles habilitado.');
        } else {
            stopVisibleRowsAutoRefresh();
            console.log('Auto-refresh de filas visibles deshabilitado.');
        }
    });

    // Asegurarse de que solo uno de los toggles esté activo al cargar la página
    //if (isVisibleRowsAutoRefreshEnabled) {
    //    autoRefreshToggle.prop('checked', false);
    //    localStorage.setItem('autoRefreshEnabled', false);
    //}
    //if (isAutoRefreshEnabled) {
    //    visibleRowsToggle.prop('checked', false);
    //    localStorage.setItem('visibleRowsAutoRefreshEnabled', false);
    //}
    

    // Funciones de auto-refresh
    function startAutoRefresh() {
        if (!autoRefreshInterval) {
            autoRefreshInterval = setInterval(function() {
                console.log('Recargando DataTable automáticamente...');
                table.ajax.reload(null, false); // false para mantener la paginación actual
            }, TIME_RELOAD); // 10 segundos
            console.log('Auto-refresh completo iniciado.');
        }
    }

    function stopAutoRefresh() {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
            console.log('Auto-refresh completo detenido.');
        }
    }

    function startVisibleRowsAutoRefresh() {
        if (!visibleRowsRefreshInterval) {
            visibleRowsRefreshInterval = setInterval(function() {
                console.log('Actualizando filas visibles...');
                stopAutoRefresh(); // Asegura que no se solapen
                refreshVisibleRows();
            }, TIME_RELOAD); // Intervalo de 10 segundos

            // -- Inicia autoRefresh inmediatamente DESPUÉS de iniciar visibleRows
            //startAutoRefresh(); console.log('filas visibles + startAutoRefresh');

            console.log('Auto-refresh de filas visibles iniciado.');
        }
    }

    function stopVisibleRowsAutoRefresh() {
        if (visibleRowsRefreshInterval) {
            clearInterval(visibleRowsRefreshInterval);
            visibleRowsRefreshInterval = null;
            console.log('Auto-refresh de filas visibles detenido.');
        }
    }

    if (isVisibleRowsAutoRefreshEnabled === null) {
        // Si no hay un valor guardado, usa el estado por defecto (checked)
        localStorage.setItem('visibleRowsAutoRefreshEnabled', 'true');
        visibleRowsToggle.prop('checked', true);
        startVisibleRowsAutoRefresh();
    } else {
        // Establece el estado del Toggle Switch según el valor guardado
        var isChecked = (isVisibleRowsAutoRefreshEnabled === 'true');
        visibleRowsToggle.prop('checked', isChecked);
        if (isChecked) {
            stopAutoRefresh();
            startVisibleRowsAutoRefresh();
        } else {
            stopVisibleRowsAutoRefresh();
        }
    }

    // =============================================
    // FUNCIONES AUXILIARES GLOBALES
    // =============================================
    function cleanupHighlightState() {
        const now = Date.now();
        for (let alarmId in highlightState) {
            for (let colIndex in highlightState[alarmId]) {
                if (highlightState[alarmId][colIndex] < now) {
                    // Ya caducó
                    delete highlightState[alarmId][colIndex];
                }
            }
            if (Object.keys(highlightState[alarmId]).length === 0) {
                delete highlightState[alarmId];
            }
        }
    }


    /*******************************************************************************/
    // Definir los índices de las columnas a excluir del resaltado
    const excludedColumns = [10];

    // Función para actualizar filas visibles
    async function refreshVisibleRows() {
        try {
            // Obtener las filas actualmente visibles en la página
            const visibleRows = table.rows({ page: 'current' }).data();
            const originalAlarmIds = [];
            const ids = visibleRows.map(row => row._id);


            // Extraer los alarmId de las filas visibles
            for (let i = 0; i < visibleRows.length; i++) {
                originalAlarmIds.push(visibleRows[i]._id);
            }

            if (originalAlarmIds.length === 0) {
                console.warn('No hay alarm_ids visibles para actualizar.');
                return; // No hay filas visibles
            }
//
           // // Eliminar duplicados
           // const uniqueAlarmIds = [...new Set(originalAlarmIds)];

           const uniqueAlarmIds = [...new Set(originalAlarmIds)];

            // Obtener el token CSRF desde la etiqueta meta
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

            // Enviar solicitud al backend para obtener los campos actualizados
            const response = await fetch('/update_visible_alarms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken  // Incluir el token CSRF en la cabecera
                },
                body: JSON.stringify({ alarm_ids: uniqueAlarmIds })
                //body: JSON.stringify({ ids: uniqueAlarmIds })
            });

            if (!response.ok) {
                throw new Error(`Error en la solicitud: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.error) {
                console.error('Error al actualizar filas visibles:', result.error);
                return;
            }

            const updatedData = result.data;

            // Función auxiliar para actualizar una celda y aplicar la clase de resaltado si cambia
            function updateCellIfChanged(rowIndex, colIndex, newData, alarmId) {
                // Obtener el dato actual de la celda
                const cell = table.cell(rowIndex, colIndex);
                const currentData = cell.data();

                // Asegúrate de convertir ambos a cadenas y normalizar los datos
                function normalizeData(data) {
                    return String(data).trim().toLowerCase();
                }

                if (normalizeData(currentData) !== normalizeData(newData)) {
                    //console.info(`Datos diferentes detectados: ${normalizeData(currentData)} !== ${normalizeData(newData)}`);
                
                
                    // Actualizar el dato de la celda
                    cell.data(newData);

                    // Obtener el nodo de la celda
                    const cellNode = cell.node();

                    // Verificar si la columna está excluida
                    if (!excludedColumns.includes(colIndex)) {
                        // Agregar la clase 'updated-cell' si no la tiene
                        if (!$(cellNode).hasClass('updated-cell')) {
                            
                            $(cellNode).addClass('updated-cell');

                            // 2. Guardar en highlightState
                            if (!highlightState[alarmId]) {
                                highlightState[alarmId] = {};
                            }
                            highlightState[alarmId][colIndex] = Date.now() + TIME_VER_CELDA + 10; // la celda se verá resaltada hasta dentro de 30s     
                            console.log('highlightState:' + highlightState);                     

                            // Remover la clase 'updated-cell' y agregar 'fade-out' después de 3 segundos
                            setTimeout(() => {  $(cellNode).removeClass('updated-cell').addClass('updated-cell-medio');
                                // Remover la clase 'fade-out' después de la transición
                                setTimeout(() => {  $(cellNode).removeClass('updated-cell-medio').addClass('updated-cell-exit'); }, TIME_INTER_CELDA); // Asegúrate de que este tiempo coincida con tu transición CSS
                                setTimeout(() => {  $(cellNode).removeClass('fade-out'); }, TIME_INTER_CELDA); // Asegúrate de que este tiempo coincida con tu transición CSS
                            }, TIME_VER_CELDA); // Tiempo durante el cual la celda permanece resaltada
                        }
                    }
                }
            }

            // Iterar sobre cada alarma actualizada y actualizar las celdas correspondientes
            updatedData.forEach(alarm => {
                // Encontrar el índice de la fila correspondiente en DataTables usando _id
                const rowIndex = table.rows().indexes().filter(idx => table.row(idx).data()._id === alarm._id)[0];

                if (rowIndex !== undefined) {
                    // Actualizar 'origenId' en la columna 1
                    updateCellIfChanged(rowIndex, 1, alarm.origenId, alarm._id);

                    // Actualizar 'alarmClearedTime' en la columna 9
                    updateCellIfChanged(rowIndex, 9, alarm.alarmClearedTime, alarm._id);

                    // Actualizar 'alarmState' en la columna 2
                    updateCellIfChanged(rowIndex, 2, alarm.alarmState, alarm._id);

                    // Actualizar 'timeDiffRep' en la columna 10 (Excluida del resaltado)
                    updateCellIfChanged(rowIndex, 10, alarm.timeDiffRep, alarm._id);

                    // Si hay otros campos que desees actualizar, agrégalos aquí
                    // Ejemplo:
                    // updateCellIfChanged(rowIndex, columnaX, alarm.campoX, alarm._id);
                } else {
                    console.warn(`Fila con _id ${alarm._id} no encontrada.`);
                }
            });

            // Redibujar la tabla para reflejar los cambios sin recargar datos desde el servidor
            // table.draw(false); // Esta línea se ha comentado para evitar la llamada a /get_alarmas

        } catch (error) {
            console.error('Error en refreshVisibleRows:', error);
        }
    }


});





/*******************************************************************************/

// Función auxiliar para agregar cero a la izquierda si es necesario
function padZero(number) {
    return number.toString().padStart(2, '0');
}

// Función para actualizar "T-to Repar" cada x segundos en formato MM:SS
function updateTtoRepar() {
    const tToReparElements = document.querySelectorAll('.t-to-repar');
    const now = new Date();

    tToReparElements.forEach(element => {

        let alarmReportingTimeStr = element.getAttribute('data-alarmreportingtime');
        //console.log('Actualizando T-to Repar vs. alarmReportingTime:', alarmReportingTimeStr);
        
        if (alarmReportingTimeStr && alarmReportingTimeStr !== '-') {
            // Agregar el año actual a la cadena de fecha
            //console.log('Fecha con año completo:', alarmReportingTimeStr);

            // Parsear la fecha y hora de la alarma
            const alarmRaisedTime = new Date(alarmReportingTimeStr);
            //console.log('Parsed alarmRaisedTime:', alarmRaisedTime);
            
            if (!isNaN(alarmRaisedTime)) {
                const diffMs = now - alarmRaisedTime; // Diferencia en milisegundos
                //console.log('Diferencia en ms:', diffMs);
                
                // Verificar si la diferencia es negativa
                if (diffMs < 0) {
                    console.warn('alarmRaisedTime está en el futuro:', alarmReportingTimeStr);
                    element.textContent = '0:00 min';
                    return;
                }

                // Calcular minutos y segundos
                const diffTotalSeconds = Math.floor(diffMs / 1000);
                const minutes = Math.floor(diffTotalSeconds / 60);
                const seconds = diffTotalSeconds % 60;

                //console.log(`Diferencia: ${minutes}:${seconds}`);

                let formattedTime;

                if (minutes > 99) { // Cambia la condición según tu necesidad
                    formattedTime = `${minutes}`;
                } else {
                    formattedTime = `${minutes}:${padZero(seconds)}`;
                }

                //console.log(`Diferencia: ${formattedTime}`);

                element.textContent = `${formattedTime} min`;
            } else {
                console.warn('alarmReportingTime no es una fecha válida:', alarmReportingTimeStr);
                element.textContent = 'Tiempo Inválido';
            }
        } else {
            element.textContent = '-';
        }
    });
}



// Ejecutar la función al cargar la página y cada 5 segundos
document.addEventListener('DOMContentLoaded', function () {
    updateTtoRepar();
    setInterval(updateTtoRepar, 1000);
});

/*******************************************************************************/

// Variables globales para la paginación del modal
let currentModalPage = 1;
const itemsPerPage = 10;
let totalModalPages = 1;
let currentQuery = '';

// Función para buscar alarmas con paginación del servidor
function searchAlarms(query, page = 1, limit = itemsPerPage) {
    document.getElementById('loading-message').style.display = 'block';

    fetch(`/search_alarm?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('loading-message').style.display = 'none';
            if (data.error) {
                alert(data.error);
                return;
            }
            currentModalPage = data.page;
            totalModalPages = data.total_pages;
            currentQuery = query;

            displayModal(data.data);
            updatePaginationControls();
        })
        .catch(error => {
            document.getElementById('loading-message').style.display = 'none';
            console.error('Error:', error);
            alert('Ocurrió un error al buscar las alarmas.');
        });
}

/*******************************************************************************/

// Función para reiniciar la barra de progreso
function resetProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = '0%';

    const refreshButton = document.querySelector('.btn-modern');
    refreshButton.style.backgroundColor = '#5290d3';
}

/*******************************************************************************/

// Función para actualizar la hora local
function updateLocalTime() {
    const now = new Date();
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    const formattedTime = now.toLocaleString('es-AR', options);
    document.getElementById('local-time').textContent = formattedTime;
}

/*******************************************************************************/

// Captura los eventos de clic en los botones de exportación
document.querySelectorAll('.export-btn').forEach(function(button) {
    button.addEventListener('click', function(event) {
        document.getElementById('loading-message').style.display = 'block';
        var exportUrl = button.getAttribute('data-export');
        var iframe = document.getElementById('download-frame');
        iframe.src = exportUrl;

        setTimeout(function() {
            document.getElementById('loading-message').style.display = 'none';
        }, 10000);

        event.preventDefault();
    });
});

/*******************************************************************************/

// Ajustar dinámicamente la posición del tooltip
$(document).ready(function() {
    $('.tooltip-cell').hover(function() {
        var tooltip = $(this).find('.tooltip-text');

        tooltip.css('visibility', 'visible').css('opacity', '1');

        var tooltipRect = tooltip[0].getBoundingClientRect();
        var windowWidth = $(window).width();
        var windowHeight = $(window).height();

        var left = tooltipRect.left;
        var right = tooltipRect.right;
        var top = tooltipRect.top;

        if (left < 0) {
            tooltip.css('left', '0').css('right', 'auto');
        }

        if (right > windowWidth) {
            tooltip.css('left', 'auto').css('right', '0');
        }

        if (top < 0) {
            tooltip.css('top', '100%').css('bottom', 'auto');
        }
    }, function() {
        var tooltip = $(this).find('.tooltip-text');
        tooltip.css('visibility', 'hidden').css('opacity', '0');
        tooltip.css('left', '').css('right', '').css('top', '').css('bottom', '');
    });
});

/*******************************************************************************/

// Listener para clic en alarmId (primera columna) utilizando data-alarmid
$('#alarmTable tbody').on('click', 'td:first-child .tooltip-cell', function () {
    var alarmId = $(this).data('alarmid');
    //console.log("Alarm ID clicked:", alarmId);

    if (alarmId) {
        searchAlarms(alarmId, 1, itemsPerPage);
    }
});

/*******************************************************************************/

// Función para desplegar el modal con los resultados usando highlight.js y paginación
function displayModal(data) {
    const modal = document.getElementById('modal');
    const modalResults = document.getElementById('modal-results');
    
    modalResults.scrollTop = 0;
    modalResults.innerHTML = '';

    if (data && data.length > 0) {
        data.forEach(item => {
            let detalles = 'Detalles: N/A';

            if (item._class === "ar.com.teco.models.EventNotificationAudit" || item._class === "ar.com.teco.models.NotificationAudit") {
                detalles = 'Detalles Audit';
            } else if (item.offsetKafka) {
                detalles = 'Detalles Trifecta';
            }

            const formattedJSON = JSON.stringify(item, null, 4);

            modalResults.innerHTML += `
                <div class="result-item">
                    <p><strong>AlarmId:</strong> ${item.alarmId}</p>
                    <p><strong>OrigenId:</strong> ${item.origenId ? item.origenId : ''}</p>
                    <p><strong>${detalles}:</strong></p>
                    <pre><code class="json">${formattedJSON}</code></pre>
                </div>
                <hr>
            `;
        });
    } else {
        modalResults.innerHTML = '<p>No se encontraron resultados</p>';
    }

    hljs.highlightAll();
    modal.classList.add('show');
}

/*******************************************************************************/

// Función para actualizar los controles de paginación
function updatePaginationControls() {
    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');
    const currentPageSpan = document.getElementById('current-page');

    currentPageSpan.textContent = `Página ${currentModalPage} de ${totalModalPages}`;

    prevPageButton.disabled = currentModalPage === 1;
    nextPageButton.disabled = currentModalPage === totalModalPages;
}

// Eventos para los botones de paginación
document.getElementById('prev-page').addEventListener('click', function() {
    if (currentModalPage > 1) {
        searchAlarms(currentQuery, currentModalPage - 1, itemsPerPage);
    }
});

document.getElementById('next-page').addEventListener('click', function() {
    if (currentModalPage < totalModalPages) {
        searchAlarms(currentQuery, currentModalPage + 1, itemsPerPage);
    }
});

/*******************************************************************************/

// Función para cerrar el modal cuando se hace clic en la 'X'
document.getElementById('close-modal').addEventListener('click', function () {
    let modal = document.getElementById('modal');
    modal.classList.remove('show');
});

// Cerrar el modal al hacer clic fuera del contenido del modal
window.addEventListener('click', function(event) {
    let modal = document.getElementById('modal');
    if (event.target == modal) {
        modal.classList.remove('show');
    }
});

/*******************************************************************************/

// Actualización de la hora local y la barra de progreso
document.addEventListener('DOMContentLoaded', function () {
    updateLocalTime();
    setInterval(updateProgressBar, 10000);
});

// Función para actualizar la hora local
function updateLocalTime() {
    const now = new Date();
    const options = {
        timeZone: 'America/Argentina/Buenos_Aires',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    };
    const formattedTime = new Intl.DateTimeFormat('es-AR', options).format(now);
    document.getElementById('local-time').textContent = formattedTime;
    //console.log('Local time updated:', formattedTime);
}

// Función para actualizar la barra de progreso
function updateProgressBar() {
    const now = new Date();
    const localTimeElement = document.getElementById('local-time').textContent;
    const loaderElement = document.querySelector('.loader');

    //console.log('Current time:', now);
    //console.log('Local time element:', localTimeElement);

    const [datePart, timePart] = localTimeElement.replace(',', '').split(' ');
    const [day, month, year] = datePart.split('/');
    const [hours, minutes, seconds] = timePart.split(':');

    //console.log('Parsed date:', year, month, day);
    //console.log('Parsed time:', hours, minutes, seconds);

    const lastUpdate = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`);
    //console.log('Last update time:', lastUpdate);

    if (isNaN(lastUpdate.getTime())) {
        console.error('Error: Invalid date parsed.');
        return;
    }

    const elapsed = now - lastUpdate;
    //console.log('Elapsed time (ms):', elapsed);

    const percentage = Math.min((elapsed / 600000) * 100, 100); // 10 minutos = 600,000 ms
    //console.log("Progress percentage:", Math.round(percentage) + "% | Last update time:", lastUpdate);


    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = percentage + '%';

    const refreshButton = document.querySelector('.btn-modern');

    if (percentage >= 100) {
        refreshButton.style.backgroundColor = '#fe8d59';
        document.getElementById('progress-container').style.display = 'none';
        // Mostrar loader cuando la barra llegue al 100%
        loaderElement.style.display = 'inline-block';
    } else {
        refreshButton.style.backgroundColor = '#5290d3';
        document.getElementById('progress-container').style.display = 'block';
        // Ocultar loader cuando la barra esté por debajo del 100%
        loaderElement.style.display = 'none';
    }

   

}

// Evento para el botón de refresh
document.querySelector('.btn-modern').addEventListener('click', function() {
    document.getElementById('progress-container').style.display = 'block';
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = '0%';
    this.style.backgroundColor = '#5290d3';
    updateLocalTime();
});

/*******************************************************************************/

// Evento para el botón de toggle
document.getElementById('toggleButton').addEventListener('click', function() {
    var expandableDiv = document.getElementById('expandableDiv');
    
    if (expandableDiv.style.display === 'none' || expandableDiv.style.display === '') {
        expandableDiv.style.display = 'block';
    } else {
        expandableDiv.style.display = 'none';
    }
});

/*******************************************************************************/


/*******************************************************************************/