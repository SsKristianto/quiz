// static/js/user/dashboard.js

document.addEventListener('DOMContentLoaded', function() {
    var quizTableBody = document.getElementById('quizTableBody');

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

    // Initial load
    loadQuizzes();
});
