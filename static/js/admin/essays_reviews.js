// static/js/admin/essays_reviews.js

document.addEventListener('DOMContentLoaded', function() {
    var essayAnswersTableBody = document.getElementById('essayAnswersTableBody');
    var modalOverlay = document.getElementById('modalOverlay');
    var reviewModal = document.getElementById('reviewModal');
    var modalUsername = document.getElementById('modalUsername');
    var modalQuizTitle = document.getElementById('modalQuizTitle');
    var modalQuestionText = document.getElementById('modalQuestionText');
    var modalAnswerText = document.getElementById('modalAnswerText');
    var reviewForm = document.getElementById('reviewForm');
    var cancelReviewBtn = document.getElementById('cancelReviewBtn');

    var currentAnswerId = null;

    // Fetch and display essay answers
    function loadEssayAnswers() {
        fetch('/api/admin/essay-reviews')  // Pastikan endpoint ini benar
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Fetched essays:', data.essays);  // Untuk debugging
                essayAnswersTableBody.innerHTML = '';
                if (!data.essays || data.essays.length === 0) {
                    essayAnswersTableBody.innerHTML = '<tr><td colspan="5">Tidak ada jawaban essay yang perlu direview.</td></tr>';
                    return;
                }
                data.essays.forEach(answer => {
                    var row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${answer.username}</td>
                        <td>${answer.quiz_title}</td>
                        <td>${answer.question_text}</td>
                        <td>${answer.answer_text}</td>
                        <td>
                            <button class="reviewBtn" data-id="${answer.answer_id}">Review</button>
                        </td>
                    `;
                    essayAnswersTableBody.appendChild(row);
                });
                attachEventListeners();
            })
            .catch(error => {
                console.error('Error fetching essay answers:', error);
                essayAnswersTableBody.innerHTML = '<tr><td colspan="5">Terjadi kesalahan saat memuat data.</td></tr>';
            });
    }

    function attachEventListeners() {
        document.querySelectorAll('.reviewBtn').forEach(btn => {
            btn.addEventListener('click', function() {
                var answerId = this.getAttribute('data-id');
                openReviewModal(answerId);
            });
        });
    }

    function openReviewModal(answerId) {
        currentAnswerId = answerId;
        // Fetch data for the specific answer
        fetch('/api/admin/essay-reviews')  // Pastikan endpoint ini benar
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                var answer = data.essays.find(a => a.answer_id == answerId);
                if (answer) {
                    modalUsername.textContent = answer.username;
                    modalQuizTitle.textContent = answer.quiz_title;
                    modalQuestionText.textContent = answer.question_text;
                    modalAnswerText.textContent = answer.answer_text;
                    document.getElementById('answer_id').value = answer.answer_id;
                    reviewForm.reset();
                    showModal();
                } else {
                    alert('Jawaban tidak ditemukan.');
                }
            })
            .catch(error => {
                console.error('Error fetching answer data:', error);
                alert('Terjadi kesalahan saat memuat data jawaban.');
            });
    }

    function showModal() {
        reviewModal.classList.add('show');
        modalOverlay.classList.add('show');
    }

    function hideModal() {
        reviewModal.classList.remove('show');
        modalOverlay.classList.remove('show');
    }

    // Submit review form
    reviewForm.addEventListener('submit', function(event) {
        event.preventDefault();
        var formData = new FormData(reviewForm);

        fetch('/api/admin/review-essay', {  // Pastikan endpoint ini benar
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                alert('Review berhasil disimpan.');
                hideModal();
                loadEssayAnswers();
            } else {
                alert('Terjadi kesalahan: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error saving review:', error);
            alert('Terjadi kesalahan saat menyimpan review.');
        });
    });

    // Cancel review
    cancelReviewBtn.addEventListener('click', function() {
        hideModal();
    });

    // Initial load
    loadEssayAnswers();
});
