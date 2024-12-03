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
        //window.location.href = "{{ url_for('nombre_de_la_ruta_formTopologia3D') }}";
        //window.location.href = "{{ url_for('form_topologia_3d') }}"; // Flask
        window.location.href = 'templates/formTopologia3D.html';
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

// Inicialización de DataTable con procesamiento del lado del servidor
$(document).ready(function() {
    $('#loading').show();
    $('#alarmTable').hide();

    $('#alarmTable').DataTable({
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
                d.page = Math.floor(d.start / d.length) + 1;
                d.limit = d.length;
                d.search = { "value": d.search.value };
            },
            "dataSrc": function (json) {
                console.log('Datos recibidos desde server:', json.data);
                if (json.error) {
                    console.error("Error desde el servidor:", json.error);
                    alert("Hubo un error en el servidor: " + json.error);
                    return [];
                }
                return json.data;
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
            { "data": "TypeNetworkElement" },
            { "data": "networkElementId" },
            { "data": "clients" },
            { "data": "timeResolution" },
            { "data": "plays", "visible": false },
            { "data": "sequence", "visible": false }
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
                    const cssClass = data === '-' ? 'text-center' : 'text-left';
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
                        return `<div style="text-align: center;">${data}</div>`;
                    }
                    return data;
                }
            },                                    
            {
                "targets": 10, // TypeNetworkElement
                "render": function (data) {
                    return `<div style="text-align: left;">${data}</div>`;
                }
            },

            {
                "targets": 11, // Ahora corresponde a "plays"
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
                            return `<div style="text-align: right;">${data}</div>`;
                        }
                    }
                    return data;
                }
            },
                       
            {
                "targets": 12, // clients
                "type": "num",
                "render": function (data) {
                    return `<div style="text-align: right;">${data}</div>`;
                }
            },
            {
                "targets": 13, // timeResolution
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
            "processing": "Procesando...",
            "emptyTable": "No hay datos disponibles en la tabla"
        },
        "drawCallback": function() {
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
                'background-color': '#007bff',  // Cambia este color
                'color': '#000',                // Color del texto
                'padding': '10px',              // Opcional: espaciado
                'border-radius': '5px'          // Opcional: redondeo de bordes
            });
            // Reiniciar la barra de progreso
            resetProgressBar();
            updateLocalTime();
        }
    });

    $('#loading').hide();
    $('#alarmTable').show();
});

/*******************************************************************************/
//function escapeHtml(text) {
//    return text
//        .replace(/&/g, "&amp;")
//        .replace(/</g, "&lt;")
//        .replace(/>/g, "&gt;")
//        .replace(/"/g, "&quot;")
//        .replace(/'/g, "&#039;");
//}
//
//let jsonString = row.plays ? escapeHtml(JSON.stringify(row.plays, null, 2)) : 'No disponible';
//return `<pre>${jsonString}</pre>`;
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
    console.log("Alarm ID clicked:", alarmId);

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
    console.log('Local time updated:', formattedTime);
}

// Función para actualizar la barra de progreso
function updateProgressBar() {
    const now = new Date();
    const localTimeElement = document.getElementById('local-time').textContent;

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
    //console.log('Progress percentage:', percentage);
    console.log("Progress percentage:", Math.round(percentage) + "% | Last update time:", lastUpdate);


    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = percentage + '%';

    const refreshButton = document.querySelector('.btn-modern');
    if (percentage >= 100) {
        refreshButton.style.backgroundColor = '#fe8d59';
        document.getElementById('progress-container').style.display = 'none';
    } else {
        refreshButton.style.backgroundColor = '#5290d3';
        document.getElementById('progress-container').style.display = 'block';
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
