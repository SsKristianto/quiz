// static/js/admin/essay_reviews.js

document.addEventListener('DOMContentLoaded', function() {
    const essaysContainer = document.getElementById('essaysContainer');

    function loadEssays() {
        fetch('/api/admin/essay-reviews')
            .then(response => response.json())
            .then(data => {
                essaysContainer.innerHTML = '';
                if (!data.essays || data.essays.length === 0) {
                    essaysContainer.innerHTML = '<p>Tidak ada jawaban essay yang perlu direview.</p>';
                    return;
                }

                data.essays.forEach(essay => {
                    const essayDiv = document.createElement('div');
                    essayDiv.classList.add('essay-item');
                    essayDiv.innerHTML = `
                        <h3>Kuis: ${essay.quiz_title}</h3>
                        <p><strong>Pengguna:</strong> ${essay.username}</p>
                        <p><strong>Pertanyaan:</strong> ${essay.question_text}</p>
                        <p><strong>Jawaban:</strong> ${essay.answer_text}</p>
                        <div class="feedback">
                            <label>Skor (0-100):</label>
                            <input type="number" min="0" max="100" step="0.01" id="score_${essay.answer_id}">
                            <br>
                            <label>Feedback:</label>
                            <textarea id="feedback_${essay.answer_id}"></textarea>
                            <br>
                            <button onclick="submitReview(${essay.answer_id})">Simpan Review</button>
                        </div>
                    `;
                    essaysContainer.appendChild(essayDiv);
                });
            })
            .catch(error => {
                console.error('Error fetching essay reviews:', error);
                essaysContainer.innerHTML = '<p>Terjadi kesalahan saat memuat jawaban essay.</p>';
            });
    }

    window.submitReview = function(answer_id) {
        const scoreInput = document.getElementById(`score_${answer_id}`);
        const feedbackInput = document.getElementById(`feedback_${answer_id}`);

        const score = parseFloat(scoreInput.value);
        const feedback = feedbackInput.value;

        if (isNaN(score) || score < 0 || score > 100) {
            alert('Skor harus berupa angka antara 0 hingga 100.');
            return;
        }

        const payload = {
            answer_id: answer_id,
            score: score,
            feedback: feedback
        };

        fetch('/api/admin/review-essay', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(payload)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert('Review berhasil disimpan.');
                loadEssays(); // Muat ulang daftar essay
            } else {
                alert('Terjadi kesalahan: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error submitting essay review:', error);
            alert('Terjadi kesalahan saat menyimpan review.');
        });
    };

    // Initial load
    loadEssays();
});
