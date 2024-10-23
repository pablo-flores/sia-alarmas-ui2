
/*******************************************************************************/
  
document.addEventListener('keydown', function(event) {
    // Verifica si se ha presionado Ctrl + I
    if (event.ctrlKey && event.key === 'e') {
        // Prevenir la acción predeterminada
        event.preventDefault();

        // Dispara el evento de clic en el botón oculto
        document.getElementById('download-excel').click();
    }
});

/*******************************************************************************/

// Escucha el evento de clic del botón para realizar la acción de descargar Excel
document.getElementById('download-excel').addEventListener('click', function () {
    
    document.getElementById('loading-message').style.display = 'block';

  
    // Obtén una instancia de la tabla DataTable
    var table = $('#alarmTable').DataTable();

    // Desactivar la paginación para acceder a todas las filas
    table.page.len(-1).draw();

    // Inicializa un array para almacenar las filas
    var rows = [];
    
    // Selecciona todas las filas visibles en la tabla
    document.querySelectorAll("#alarmTable tr").forEach(function(row) {
        var rowData = Array.from(row.querySelectorAll("td, th")).map(function(col) {
            return col.innerText;
        });
        rows.push(rowData);
    });

    // Crea una hoja de trabajo (worksheet) con los datos
    var worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Crea un libro de trabajo (workbook) y añade la hoja
    var workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Alarmas");

    // Genera el archivo Excel
    var excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    // Crear el Blob para el archivo Excel
    var excelFile = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    var downloadLink = document.createElement("a");
    downloadLink.download = 'SIA_alarmas_' + new Date().toISOString().slice(0, 19).replace(/:/g, "-") + '.xlsx';
    downloadLink.href = URL.createObjectURL(excelFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Restaurar la paginación original
    table.page.len(15).draw(); // Cambia el número 15 al valor de la paginación por defecto de tu tabla

    // Ocultar el mensaje de "Espere..." después de 5 segundos
    setTimeout(function() {
        document.getElementById('loading-message').style.display = 'none';
    }, 10000); // Puedes ajustar el tiempo si es necesario
    
    
});


/*******************************************************************************/

document.addEventListener('keydown', function(event) {
    // Verifica si se ha presionado Ctrl + P
    if (event.ctrlKey && event.key === 'I') {
        // Prevenir la acción predeterminada de imprimir
        event.preventDefault();

        // Dispara el evento de clic en el botón oculto
        document.getElementById('download-csv').click();
    }
});


// Escucha el evento de clic del botón para realizar la acción deseada
document.getElementById('download-csv').addEventListener('click', function () {

    document.getElementById('loading-message').style.display = 'block';

    // Obtén una instancia de la tabla DataTable
    var table = $('#alarmTable').DataTable();

    // Desactivar la paginación para acceder a todas las filas
    table.page.len(-1).draw();

    // Aquí puedes poner el código para descargar el archivo CSV
    console.log('Descargando CSV...');

    // Inicializa el array para almacenar las filas
    var csv = [];
    
    // Selecciona todas las filas visibles en la tabla
    var rows = document.querySelectorAll("#alarmTable tr");

    // Recorre cada fila y extrae los datos de cada celda
    rows.forEach(function(row) {
        var cols = row.querySelectorAll("td, th");
        var rowData = Array.from(cols).map(function(col) {
            return col.innerText;
        });
        csv.push(rowData.join(","));
    });

    // Crear el archivo CSV
    var csvFile = new Blob([csv.join("\n")], { type: "text/csv" });
    var downloadLink = document.createElement("a");
    downloadLink.download = 'SIA_alarmas_' + new Date().toISOString().slice(0, 19).replace(/:/g, "-") + '.csv';            
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Restaurar la paginación original
    table.page.len(15).draw(); // Cambia el número 15 al valor de la paginación por defecto de tu tabla

    // Ocultar el mensaje de "Espere..." después de 5 segundos
    setTimeout(function() {
        document.getElementById('loading-message').style.display = 'none';
    }, 10000); // Puedes ajustar el tiempo si es necesario
    
});


/*******************************************************************************/

    let estimatedLoadTime = 10; // Default estimated time in seconds (you can modify based on your data size)
    let countdownTimer;
    
    // Function to start the countdown
    function startCountdown() {
        let timeRemaining = estimatedLoadTime;

        // Update the countdown every second
        countdownTimer = setInterval(function() {
            if (timeRemaining <= 0) {
                clearInterval(countdownTimer);
                $('#countdown-timer').text('Carga completa');
            } else {
                $('#countdown-timer').text('Tiempo restante: ' + timeRemaining + ' segundos');
                timeRemaining--;
            }
        }, 1000);
    }

    // Function to estimate load time based on the number of records
    function estimateLoadTime(numRecords) {
        // Adjust the estimated time as needed
        // For example, 1 second per 100 records
        estimatedLoadTime = Math.ceil(numRecords / 100);
        startCountdown();
    }



$(document).ready(function() {
    $('#loading').show();
    $('#alarmTable').hide();

    // Llamada AJAX para obtener los datos
    $.ajax({
        url: '/get_alarmas',
        method: 'GET',
        success: function(response) {

            let tableBody = '';
            response.alarmas.forEach(function(alarma) {
                // Reemplazar "UPDATED" o "RETRY" por "RAISED" en alarma.alarmState
                //let alarmState = alarma.alarmState;
                let alarmState = alarma.alarmState.trim();
                let alarmClearedTime = alarma.alarmClearedTime;

                if (alarmState === 'UPDATED' || alarmState === 'RETRY') {
                    alarmState = 'RAISED';
                } 

                if (alarmClearedTime !== '-' ) {
                    alarmState = 'CLEARED';
                } 

                tableBody += `
                <tr>
                    <td class="tooltip-cell" style="text-align: left;">
                        ${alarma.alarmId}
                        <span class="tooltip-text">                           
                            <div class="tooltip-row">
                                <span class="tooltip-title">Origen:</span>
                                <span class="tooltip-value">${(alarma.sourceSystemId).split('').join(' ')}</span>
                            </div>
                            <div class="tooltip-row">
                                <span class="tooltip-title">Deteccion:</span>
                                <span class="tooltip-value">${alarma.alarmRaisedTime}</span>
                            </div>
                            <div class="tooltip-row">
                                <span class="tooltip-title">Reporte:</span>
                                <span class="tooltip-value">${alarma.alarmReportingTime}</span>
                            </div>
                            <div class="tooltip-row">
                                <span class="tooltip-title">Arribo Outage:</span>
                                <span class="tooltip-value">${alarma.inicioOUM}</span>
                            </div>
                            <div class="tooltip-row">
                                <span class="tooltip-title">Resuelto:</span>
                                <span class="tooltip-value">${alarma.alarmClearedTime}</span>
                            </div>
                        </span>
                    </td>
                
                    <td style="text-align: left  ;">${alarma.origenId }</td>
                    <td style="text-align: left  ;">${alarmState }</td> <!-- Use modified alarmState here -->                   
                    <td style="text-align: left  ;">${alarma.alarmType}</td>                    
                    <td style="text-align: center;">${alarma.alarmRaisedTime }</td> <!-- Centrar contenido del TD -->                            
                    <td style="text-align: center;">${alarma.alarmClearedTime }</td> <!-- Centrar contenido del TD -->
                    <td style="text-align: center;">${alarma.alarmReportingTime}</td> <!-- Centrar contenido del TD -->                    
                    <td style="text-align: center;">${alarma.inicioOUM}</td> <!-- Centrar contenido del TD -->
                    <td style="text-align: right ;">${alarma.timeDifference }</td> <!-- New column for the time difference -->
                    <td style="text-align: left  ;">${alarma.TypeNetworkElement}</td>
                    <td style="text-align: left  ;">${alarma.networkElementId}</td>
                    <td style="text-align: right ;">${alarma.clients}</td> <!-- Centrar contenido del TD -->
                    <td style="text-align: right ;">${alarma.timeResolution}</td> <!-- Centrar contenido del TD -->
                </tr>`;
            });
            $('#alarmTable tbody').html(tableBody);

            //console.log('Estado:', alarmState);


            // Inicializar DataTable
            $('#alarmTable').DataTable({
                //"scrollX": true, // Habilita el desplazamiento horizontal
                "autoWidth": true, // Previene el ajuste automático del ancho de las columnas
                "paging": true,
                "searching": true,
                "ordering": true,
                "order": [],  // No aplica un ordenamiento inicial, toma los datos tal como llegan
                "pageLength": 15,  // Cambia la cantidad de registros mostrados a 15
                "lengthMenu": [ [10, 15, 25, 50, 100, 300, -1], [10, 15, 25, 50, 100, 300, "Todos"] ],
                "columnDefs": [                                                                                      
                    {
                        "targets": 8, // Index of the 'timeDifference' column
                        "type": "num",
                        "render": function(data, type, row) {
                            if (type === 'sort' || type === 'type') {
                                // Extract numeric part for sorting
                                return parseFloat(data) || 0;
                            }
                            // Return original data for display
                            return data;
                        }
                    },
                    {
                        "targets": 11, // Índice de la columna 'Clients'
                        "type": "num" // Definir la columna como numérica
                    },
                    {
                        "targets": 12, // Index of the 'TER' column
                        "type": "num",
                        "render": function(data, type, row) {
                            if (type === 'sort' || type === 'type') {
                                // Extract numeric part for sorting
                                return parseFloat(data) || 0;
                            }
                            // Return original data for display
                            return data;
                        }
                    }
                ],

                "drawCallback": function() {

                 
                    // Re-inicializa los tooltips de las celdas
                    $('.tooltip-cell').each(function() {
                        var tooltip = $(this).find('.tooltip-text');
                        $(this).hover(function() {
                            tooltip.css('visibility', 'visible').css('opacity', '1');
                        }, function() {
                            tooltip.css('visibility', 'hidden').css('opacity', '0');
                        });
                    });

                },

                "language": {
                    "lengthMenu": "Mostrar _MENU_ entradas",
                    "zeroRecords": "No se encontraron resultados",
                    "info": "Mostrando _START_ a _END_ de _TOTAL_ entradas",
                    "infoEmpty": "Mostrando 0 a 0 de 0 entradas",
                    "infoFiltered": "(filtrado de _MAX_ entradas totales)",
                    "search": "Buscar:",
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
                "search": {
                    "caseInsensitive": true  
                }
            });

            $('#loading').hide();
            $('#alarmTable').show();

  
        },
        error: function() {
            alert('Error al cargar los datos, reintente..., sino se soluciona de aviso a APP-OSS.');
        }
    });
});

/*******************************************************************************/

// Function to get local time
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

updateLocalTime();

/*******************************************************************************/

// Captura los eventos de clic en los botones de exportación
document.querySelectorAll('.export-btn').forEach(function(button) {
    button.addEventListener('click', function(event) {
        // Muestra el mensaje de "Espere..."
        document.getElementById('loading-message').style.display = 'block';

        // Configurar la URL del archivo a descargar
        var exportUrl = button.getAttribute('data-export');

        // Descargar el archivo dentro del iframe
        var iframe = document.getElementById('download-frame');
        iframe.src = exportUrl;

        // Ocultar el mensaje de "Espere..." después de 5 segundos
        setTimeout(function() {
            document.getElementById('loading-message').style.display = 'none';
        }, 10000); // Puedes ajustar el tiempo si es necesario

        // Prevenir la redirección predeterminada
        event.preventDefault();
    });
});

/*******************************************************************************/

/*Ajustar Dinámicamente la Posición del Tooltip*/
$(document).ready(function() {
    // Ajuste del tooltip en hover
    $('.tooltip-cell').hover(function() {
        var tooltip = $(this).find('.tooltip-text');

        // Mostrar el tooltip para calcular su posición
        tooltip.css('visibility', 'visible').css('opacity', '1');

        // Obtener la posición y dimensiones del tooltip
        var tooltipRect = tooltip[0].getBoundingClientRect();
        var windowWidth = $(window).width();
        var windowHeight = $(window).height();

        // Ajustar la posición si se sale de los límites de la pantalla
        var left = tooltipRect.left;
        var right = tooltipRect.right;
        var top = tooltipRect.top;

        // Ajustar si se sale por la izquierda
        if (left < 0) {
            tooltip.css('left', '0').css('right', 'auto');
        }

        // Ajustar si se sale por la derecha
        if (right > windowWidth) {
            tooltip.css('left', 'auto').css('right', '0');
        }

        // Ajustar si se sale por la parte superior
        if (top < 0) {
            tooltip.css('top', '100%').css('bottom', 'auto');
        }
    }, function() {
        // Ocultar el tooltip y restaurar su posición original
        var tooltip = $(this).find('.tooltip-text');
        tooltip.css('visibility', 'hidden').css('opacity', '0');
        tooltip.css('left', '').css('right', '').css('top', '').css('bottom', '');
    });
});

/*******************************************************************************/
/*
// Función para actualizar el tiempo local con la zona horaria de Buenos Aires
document.addEventListener('DOMContentLoaded', function () {
    // Set the initial local time
    updateLocalTime();

    // Update the progress bar every 5 seconds
    setInterval(updateProgressBar, 5000);
});

// Function to update the local time
function updateLocalTime() {
    const now = new Date();
    const options = {
        timeZone: 'America/Argentina/Buenos_Aires', // Set to the correct timezone
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

// Function to update the progress bar
function updateProgressBar() {
    const now = new Date();
    const localTimeElement = document.getElementById('local-time').textContent;

    console.log('Current time:', now);
    console.log('Local time element:', localTimeElement);
    
    // Remove the comma and split the date and time parts
    const [datePart, timePart] = localTimeElement.replace(',', '').split(' ');
    const [day, month, year] = datePart.split('/');
    const [hours, minutes, seconds] = timePart.split(':');

    console.log('Parsed date:', year, month, day);
    console.log('Parsed time:', hours, minutes, seconds);

    // Create a new date object with the parsed values
    const lastUpdate = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`); // Adjust to the correct timezone
    console.log('Last update time:', lastUpdate);

    if (isNaN(lastUpdate.getTime())) {
        console.error('Error: Invalid date parsed.');
        return; // Exit the function to avoid further errors
    }

    const elapsed = now - lastUpdate; // Time difference in milliseconds
    console.log('Elapsed time (ms):', elapsed);

    // Calculate the percentage (10 minutes = 600,000 ms)
    // Calculate the percentage (5 minutes = 300,000 ms)
    const percentage = Math.min((elapsed / 300000) * 100, 100); // Cap at 100%
    console.log('Progress percentage:', percentage);

    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = percentage + '%';

    // Change the color based on the elapsed time
    if (percentage < 20) {
        progressBar.style.backgroundColor = 'lightgreen';
        console.log('Progress bar color: green');
    } else if (percentage < 40) {
        progressBar.style.backgroundColor = 'green';
        console.log('Progress bar color: yellow');
    } else if (percentage < 60) {
        progressBar.style.backgroundColor = 'lightyellow';
        console.log('Progress bar color: yellow');
    } else if (percentage < 80) {
        progressBar.style.backgroundColor = 'lightorange';
        console.log('Progress bar color: yellow');
    } else if (percentage < 90) {
        progressBar.style.backgroundColor = 'orange';
        console.log('Progress bar color: yellow');                        
    } else {
        progressBar.style.backgroundColor = 'red';
        console.log('Progress bar color: red');
    }



}
*/

/*******************************************************************************/
document.addEventListener('DOMContentLoaded', function () {
    // Set the initial local time
    updateLocalTime();

    // Update the progress bar every 5 seconds
    setInterval(updateProgressBar, 10000);
});

// Function to update the local time
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


// Function to update the progress bar
function updateProgressBar() {
    const now = new Date();
    const localTimeElement = document.getElementById('local-time').textContent;

    console.log('Current time:', now);
    console.log('Local time element:', localTimeElement);

    // Remove the comma and split the date and time parts
    const [datePart, timePart] = localTimeElement.replace(',', '').split(' ');
    const [day, month, year] = datePart.split('/');
    const [hours, minutes, seconds] = timePart.split(':');

    console.log('Parsed date:', year, month, day);
    console.log('Parsed time:', hours, minutes, seconds);

    // Create a new date object with the parsed values
    const lastUpdate = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}-03:00`);
    console.log('Last update time:', lastUpdate);

    if (isNaN(lastUpdate.getTime())) {
        console.error('Error: Invalid date parsed.');
        return; // Exit the function to avoid further errors
    }

    const elapsed = now - lastUpdate; // Time difference in milliseconds
    console.log('Elapsed time (ms):', elapsed);

    // Calculate the percentage (10 minutes = 600,000 ms)
    const percentage = Math.min((elapsed / 600000) * 100, 100); // Cap at 100%
    console.log('Progress percentage:', percentage);

    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = percentage + '%';

    // Check if the progress is full and change the button color
    const refreshButton = document.querySelector('.btn-modern');
    if (percentage >= 100) {
        refreshButton.style.backgroundColor = '#fe8d59';//'red'; // Change the button color to red
        document.getElementById('progress-container').style.display = 'none'; // Hide the progress bar
    } else {
        refreshButton.style.backgroundColor = '#5290d3'; // Reset to the original color
        document.getElementById('progress-container').style.display = 'block'; // Make sure the progress bar is visible
    }
}


document.querySelector('.btn-modern').addEventListener('click', function() {
    // Mostrar el contenedor de progreso
    document.getElementById('progress-container').style.display = 'block';

    // Reiniciar el ancho de la barra de progreso
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = '0%';

    // Restablecer el color del botón de "Refresh"
    this.style.backgroundColor = '#5290d3';

    // Actualizar la hora local
    updateLocalTime();
});


/*******************************************************************************/

document.getElementById('toggleButton').addEventListener('click', function() {
    var expandableDiv = document.getElementById('expandableDiv');
    
    // Verifica si el contenido es visible
    if (expandableDiv.style.display === 'none' || expandableDiv.style.display === '') {
        expandableDiv.style.display = 'block'; // Mostrar el contenido
    } else {
        expandableDiv.style.display = 'none'; // Ocultar el contenido
    }
});


/*******************************************************************************/
