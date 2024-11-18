// static/js/admin/essays_reviews.js

document.addEventListener('DOMContentLoaded', function () {
    // --- Referensi Elemen ---
    const essayAnswersTableBody = document.getElementById('essayAnswersTableBody');
    const reviewModalToggle = document.getElementById('reviewModalToggle');
    const reviewForm = document.getElementById('reviewForm');
    const modalUsername = document.getElementById('modalUsername');
    const modalQuizTitle = document.getElementById('modalQuizTitle');
    const modalQuestionText = document.getElementById('modalQuestionText');
    const modalAnswerText = document.getElementById('modalAnswerText');
    const modalAnswerId = document.getElementById('modalAnswerId');
    const pendingEssaysBadge = document.getElementById('pendingEssaysBadge');
    const toastContainer = document.getElementById('toastContainer');

    // --- Helper Functions ---

    // Toast Notification
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} shadow-lg flex items-center`;
        toast.innerHTML = `
            <span>${message}</span>
            <button class="btn btn-sm btn-ghost ml-4">
                <i class="fas fa-times"></i>
            </button>
        `;
        toastContainer.appendChild(toast);

        // Remove toast when close button is clicked
        toast.querySelector('button').addEventListener('click', function () {
            toast.remove();
        });

        // Auto-remove toast after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    // Open Modal dengan Data Essay
    function openReviewModal(essay) {
        modalUsername.textContent = essay.username;
        modalQuizTitle.textContent = essay.quiz_title;
        modalQuestionText.textContent = essay.question_text;
        modalAnswerText.textContent = essay.answer_text;
        modalAnswerId.value = essay.answer_id;
        document.getElementById('score').value = '';
        document.getElementById('feedback').value = '';
        reviewModalToggle.checked = true;
    }

    // Close Modal
    function closeReviewModal() {
        reviewModalToggle.checked = false;
    }

    // Escape HTML untuk mencegah XSS
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function (m) { return map[m]; });
    }

    // Fetch dan Tampilkan Essay yang Perlu Direview
    function loadEssays() {
        console.log('Memuat essay yang perlu direview...');
        fetch('/api/admin/essay-reviews')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Data essay diterima:', data);
                essayAnswersTableBody.innerHTML = '';
                if (!data.essays || data.essays.length === 0) {
                    essayAnswersTableBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center">Tidak ada jawaban essay yang perlu direview.</td>
                        </tr>
                    `;
                    pendingEssaysBadge.textContent = '0';
                    return;
                }

                pendingEssaysBadge.textContent = data.essays.length;

                data.essays.forEach(essay => {
                    const row = document.createElement('tr');

                    row.innerHTML = `
                        <td>${escapeHtml(essay.username)}</td>
                        <td>${escapeHtml(essay.quiz_title)}</td>
                        <td>${escapeHtml(essay.question_text)}</td>
                        <td>${escapeHtml(essay.answer_text)}</td>
                        <td>
                            <button class="btn btn-sm btn-primary reviewBtn" data-id="${essay.answer_id}" data-username="${escapeHtml(essay.username)}" data-quiz="${escapeHtml(essay.quiz_title)}" data-question="${escapeHtml(essay.question_text)}" data-answer="${escapeHtml(essay.answer_text)}">
                                <i class="fas fa-edit mr-2"></i>Review
                            </button>
                        </td>
                    `;
                    essayAnswersTableBody.appendChild(row);
                });

                attachReviewButtonListeners();
            })
            .catch(error => {
                console.error('Error fetching essay reviews:', error);
                essayAnswersTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">Terjadi kesalahan saat memuat jawaban essay.</td>
                    </tr>
                `;
                showToast('Terjadi kesalahan saat memuat jawaban essay.', 'error');
            });
    }

    // Attach event listeners ke tombol Review
    function attachReviewButtonListeners() {
        const reviewButtons = document.querySelectorAll('.reviewBtn');
        reviewButtons.forEach(button => {
            button.addEventListener('click', function () {
                const essay = {
                    answer_id: this.getAttribute('data-id'),
                    username: this.getAttribute('data-username'),
                    quiz_title: this.getAttribute('data-quiz'),
                    question_text: this.getAttribute('data-question'),
                    answer_text: this.getAttribute('data-answer')
                };
                openReviewModal(essay);
            });
        });
    }

    // Handle Form Submission untuk Review Essay
    reviewForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const answer_id = modalAnswerId.value;
        const score = parseFloat(document.getElementById('score').value);
        const feedback = document.getElementById('feedback').value.trim();

        // Validasi input
        if (isNaN(score) || score < 0 || score > 100) {
            showToast('Skor harus berupa angka antara 0 hingga 100.', 'warning');
            return;
        }

        const payload = {
            answer_id: answer_id,
            score: score,
            feedback: feedback
        };

        console.log('Mengirim review:', payload);

        fetch('/api/admin/review-essay', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(payload)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Response dari server:', data);
                if (data.status === 'success') {
                    showToast('Review berhasil disimpan.', 'success');
                    closeReviewModal();
                    loadEssays();
                } else {
                    showToast('Terjadi kesalahan: ' + data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error submitting essay review:', error);
                showToast('Terjadi kesalahan saat menyimpan review.', 'error');
            });
    });

    
    // Highlight active navigation menu based on current URL
    function highlightActiveMenu() {
        const currentUrl = window.location.pathname;
        const navLinks = document.querySelectorAll('nav:nth-of-type(2) a');

        navLinks.forEach(link => {
            if (link.getAttribute('href') === currentUrl) {
                link.classList.add('bg-primary', 'text-white');
            }
        });
    }

    // Initial load
    loadEssays();
    highlightActiveMenu();
});
