// static/js/user/history.js

document.addEventListener('DOMContentLoaded', function() {
    var historyTableBody = document.getElementById('historyTableBody');

    function loadHistory() {
        fetch('/api/user/quiz-history')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Fetched history:', data.history);  // Untuk debugging
                historyTableBody.innerHTML = '';
                if (!data.history || data.history.length === 0) {
                    historyTableBody.innerHTML = '<tr><td colspan="4">Anda belum mengikuti kuis apapun.</td></tr>';
                    return;
                }

                data.history.forEach(item => {
                    var row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.title}</td>
                        <td>${item.description || ''}</td>
                        <td>${item.finished_at}</td>
                        <td>
                            <a href="/user/quiz-results/${item.quiz_id}/${item.history_id}">Lihat Hasil</a>
                        </td>
                    `;
                    historyTableBody.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Error fetching quiz history:', error);
                historyTableBody.innerHTML = '<tr><td colspan="4">Terjadi kesalahan saat memuat riwayat kuis.</td></tr>';
            });
    }

    // Initial load
    loadHistory();
});
