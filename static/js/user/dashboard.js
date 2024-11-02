// static/js/user/dashboard.js

document.addEventListener('DOMContentLoaded', function() {
    var quizTableBody = document.getElementById('quizTableBody');
    var historyTableBody = document.getElementById('historyTableBody');

    function loadQuizzes() {
        fetch('/api/user/quizzes')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data.quizzes || data.quizzes.length === 0) {
                    quizTableBody.innerHTML = '<tr><td colspan="3">Tidak ada kuis yang tersedia.</td></tr>';
                    return;
                }

                quizTableBody.innerHTML = '';
                data.quizzes.forEach(quiz => {
                    var row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${quiz.title}</td>
                        <td>${quiz.description || ''}</td>
                        <td>
                            <a href="/user/take-quiz/${quiz.quiz_id}">Mulai Kuis</a>
                        </td>
                    `;
                    quizTableBody.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Error fetching quizzes:', error);
                quizTableBody.innerHTML = '<tr><td colspan="3">Terjadi kesalahan saat memuat kuis.</td></tr>';
            });
    }

    function loadHistory() {
        fetch('/api/user/quiz-history')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
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

    // Memuat daftar kuis dan riwayat kuis saat halaman dimuat
    loadQuizzes();
    loadHistory();
});
