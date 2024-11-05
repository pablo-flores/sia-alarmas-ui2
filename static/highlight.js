function displayModal(data) {
    let modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = '';

    if (data && data.length > 0) {
        data.forEach(item => {
            const formattedJSON = JSON.stringify(item, null, 4);
            modalContent.innerHTML += `
                <div class="result-item">
                    <p><strong>Alarm ID:</strong> ${item.alarmId}</p>
                    <p><strong>Origen ID:</strong> ${item.origenId}</p>
                    <p><strong>Estado:</strong> ${item.alarmState}</p>
                    <p><strong>Detalles:</strong></p>
                    <pre><code class="json">${formattedJSON}</code></pre>
                </div>
                <hr>
            `;
        });

        hljs.highlightAll();
    } else {
        modalContent.innerHTML = '<p>No se encontraron resultados</p>';
    }

    // Mostrar el modal
    document.getElementById('modal').style.display = 'block';
}
