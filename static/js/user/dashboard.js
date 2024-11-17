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
                        <td class="text-center">
                            <a href="/user/take-quiz/${quiz.quiz_id}" class="btn btn-sm btn-primary">Mulai Kuis</a>
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
                        <td>${new Date(item.finished_at).toLocaleString()}</td>
                        <td class="text-center">
                            <a href="/user/quiz-results/${item.quiz_id}/${item.history_id}" class="btn btn-sm btn-secondary">Lihat Hasil</a>
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

    // Optional: Tambah Kuis
    const addQuizForm = document.getElementById('addQuizForm');
    if (addQuizForm) {
        addQuizForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const title = document.getElementById('quizTitle').value.trim();
            const description = document.getElementById('quizDescription').value.trim();

            if (!title || !description) {
                alert('Judul dan deskripsi kuis wajib diisi.');
                return;
            }

            fetch('/api/user/add-quiz', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, description }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('Kuis berhasil ditambahkan.');
                    loadQuizzes();
                    closeModal();
                } else {
                    alert('Terjadi kesalahan: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error adding quiz:', error);
                alert('Terjadi kesalahan saat menambah kuis.');
            });
        });
    }

    // Optional: Filter Riwayat
    const filterHistoryForm = document.getElementById('filterHistoryForm');
    if (filterHistoryForm) {
        filterHistoryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const filterDate = document.getElementById('filterDate').value;

            // Implementasi filter sesuai kebutuhan
            // Misalnya, fetch riwayat dengan parameter tanggal
            fetch(`/api/user/quiz-history?date=${filterDate}`)
                .then(response => response.json())
                .then(data => {
                    historyTableBody.innerHTML = '';
                    if (!data.history || data.history.length === 0) {
                        historyTableBody.innerHTML = '<tr><td colspan="4">Tidak ada riwayat kuis pada tanggal tersebut.</td></tr>';
                        return;
                    }

                    data.history.forEach(item => {
                        var row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${item.title}</td>
                            <td>${item.description || ''}</td>
                            <td>${new Date(item.finished_at).toLocaleString()}</td>
                            <td class="text-center">
                                <a href="/user/quiz-results/${item.quiz_id}/${item.history_id}" class="btn btn-sm btn-secondary">Lihat Hasil</a>
                            </td>
                        `;
                        historyTableBody.appendChild(row);
                    });
                })
                .catch(error => {
                    console.error('Error filtering quiz history:', error);
                    historyTableBody.innerHTML = '<tr><td colspan="4">Terjadi kesalahan saat memfilter riwayat kuis.</td></tr>';
                });
        });
    }

    // Fungsi untuk membuka dan menutup modal
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('modal-open');
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('modal-open');
        }
    }

    function closeModal() {
        closeModal('addQuizModal');
    }

    function closeFilterModal() {
        closeModal('filterHistoryModal');
    }

    // Memuat daftar kuis dan riwayat kuis saat halaman dimuat
    loadQuizzes();
    loadHistory();

    // Optional: Handle tombol tambah kuis dan filter
    const addQuizButton = document.querySelector('.btn.btn-primary'); // Pastikan selector sesuai
    if (addQuizButton) {
        addQuizButton.addEventListener('click', function() {
            openModal('addQuizModal');
        });
    }

    const filterHistoryButton = document.querySelector('.btn.btn-secondary'); // Pastikan selector sesuai
    if (filterHistoryButton) {
        filterHistoryButton.addEventListener('click', function() {
            openModal('filterHistoryModal');
        });
    }
});
