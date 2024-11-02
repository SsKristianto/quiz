// static/js/user/results.js

document.addEventListener('DOMContentLoaded', function() {
    // Mendapatkan quizId dan historyId dari URL
    const urlParts = window.location.pathname.split('/');
    const quizId = urlParts[3];
    const historyId = urlParts[4];

    function loadResults() {
        fetch(`/api/user/quiz-results/${quizId}/${historyId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                document.getElementById('mc_score').textContent = data.mc_score.toFixed(2);
                document.getElementById('essay_score').textContent = data.essay_score.toFixed(2);
                document.getElementById('total_score').textContent = data.total_score.toFixed(2);

                // Render hasil kuis
                const resultsContainer = document.getElementById('resultsContainer');
                if (!data.user_answers || data.user_answers.length === 0) {
                    resultsContainer.innerHTML = '<p>Tidak ada jawaban yang ditemukan.</p>';
                    return;
                }

                data.user_answers.forEach((answer, index) => {
                    var resultDiv = document.createElement('div');
                    resultDiv.classList.add('result');

                    resultDiv.innerHTML = `<p>${index + 1}. ${answer.question_text}</p>`;

                    if (answer.question_type === 'multiple_choice') {
                        var selectedOptionIds = answer.selected_option_ids ? answer.selected_option_ids.split(',') : [];
                        var correctOptionIds = data.correct_options ? data.correct_options[answer.question_id.toString()] : [];

                        // Konversi ID ke number untuk perbandingan yang tepat
                        selectedOptionIds = selectedOptionIds.map(Number);
                        correctOptionIds = correctOptionIds.map(Number);

                        var isCorrect = false;
                        if (correctOptionIds) {
                            isCorrect = setEquals(new Set(selectedOptionIds), new Set(correctOptionIds));
                        }

                        resultDiv.innerHTML += `<p>Status: ${isCorrect ? 'Benar' : 'Salah'}</p>`;
                    } else if (answer.question_type === 'essay') {
                        resultDiv.innerHTML += `<p>Jawaban Anda: ${answer.answer_text}</p>`;
                        // Tampilkan skor dan feedback jika tersedia
                        if (data.essay_reviews && data.essay_reviews[answer.question_id.toString()]) {
                            var review = data.essay_reviews[answer.question_id.toString()];
                            resultDiv.innerHTML += `<p>Skor: ${review.score.toFixed(2)}</p>`;
                            resultDiv.innerHTML += `<p>Feedback: ${review.feedback}</p>`;
                        } else {
                            resultDiv.innerHTML += `<p>Status: Belum direview</p>`;
                        }
                    }

                    resultsContainer.appendChild(resultDiv);
                });
            })
            .catch(error => {
                console.error('Error fetching quiz results:', error);
                const resultsContainer = document.getElementById('resultsContainer');
                resultsContainer.innerHTML = '<p>Terjadi kesalahan saat memuat hasil kuis.</p>';
            });
    }

    function setEquals(a, b) {
        if (a.size !== b.size) return false;
        for (var elem of a) {
            if (!b.has(elem)) return false;
        }
        return true;
    }

    // Initial load
    loadResults();
});
