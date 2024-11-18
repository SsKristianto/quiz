// static/js/admin/quiz_questions.js

document.addEventListener('DOMContentLoaded', function () {
    // --- Referensi Elemen ---
    var quizTableBody = document.getElementById('quizTableBody');
    var addQuizBtn = document.getElementById('addQuizBtn'); // Label untuk menambah kuis
    var quizModalToggle = document.getElementById('quiz-modal-toggle');
    var quizForm = document.getElementById('quizForm');
    var questionTableBody = document.getElementById('questionTableBody');
    var addQuestionBtn = document.getElementById('addQuestionBtn');
    var questionModalToggle = document.getElementById('question-modal-toggle');
    var questionForm = document.getElementById('questionForm');
    var optionsContainer = document.getElementById('optionsContainer');
    var optionsList = document.getElementById('optionsList');
    var addOptionBtn = document.getElementById('addOptionBtn');
    var pendingEssaysBadge = document.getElementById('pendingEssaysBadge');

    var selectedQuizId = null;
    var quizzesList = []; // Menyimpan daftar kuis
    var questionsList = []; // Menyimpan daftar pertanyaan untuk kuis yang dipilih

    // --- Helper Functions ---

    function showModal(modalToggle) {
        modalToggle.checked = true;
    }

    function hideModal(modalToggle) {
        modalToggle.checked = false;
    }

    // --- Toast Notification ---
    var toastContainer = document.getElementById('toastContainer');

    function showToast(message, type = 'success') {
        var toast = document.createElement('div');
        toast.className = `alert alert-${type} shadow-lg flex items-center`;
        toast.innerHTML = `
            <span>${message}</span>
            <button class="btn btn-sm btn-ghost ml-4">
                <i class="fas fa-times"></i>
            </button>
        `;
        toastContainer.appendChild(toast);

        // Remove toast ketika tombol close diklik
        toast.querySelector('button').addEventListener('click', function () {
            toast.remove();
        });

        // Auto-remove toast setelah 5 detik
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    // --- Manajemen Kuis ---

    // Fetch and display quizzes
    function loadQuizzes() {
        fetch('/api/admin/quizzes')
            .then(response => response.json())
            .then(data => {
                quizzesList = data.quizzes; // Simpan daftar kuis
                quizTableBody.innerHTML = '';
                data.quizzes.forEach(quiz => {
                    var row = document.createElement('tr');

                    row.innerHTML = `
                        <td>
                            <a href="#" class="quizLink text-primary underline font-bold cursor-pointer hover:text-secondary transition-colors" data-id="${quiz.quiz_id}">
                                ${quiz.title}
                            </a>
                        </td>
                        <td>${quiz.description || '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-primary editQuizBtn" data-id="${quiz.quiz_id}">
                                <i class="fas fa-edit mr-2"></i>Edit
                            </button>
                            <button class="btn btn-sm btn-error deleteQuizBtn" data-id="${quiz.quiz_id}">
                                <i class="fas fa-trash-alt mr-2"></i>Hapus
                            </button>
                        </td>
                    `;
                    quizTableBody.appendChild(row);
                });
                attachQuizEventListeners();
            })
            .catch(error => {
                console.error('Error fetching quizzes:', error);
                showToast('Terjadi kesalahan saat memuat data kuis.', 'error');
            });
    }

    function attachQuizEventListeners() {
        // Edit Quiz Buttons
        document.querySelectorAll('.editQuizBtn').forEach(btn => {
            btn.addEventListener('click', function () {
                var quizId = this.getAttribute('data-id');
                editQuiz(quizId);
            });
        });

        // Delete Quiz Buttons
        document.querySelectorAll('.deleteQuizBtn').forEach(btn => {
            btn.addEventListener('click', function () {
                var quizId = this.getAttribute('data-id');
                deleteQuiz(quizId);
            });
        });

        // Quiz Links to Load Questions
        document.querySelectorAll('.quizLink').forEach(link => {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                selectedQuizId = this.getAttribute('data-id');
                loadQuestions(selectedQuizId);
                addQuestionBtn.disabled = false;
                // Highlight the selected quiz (opsional)
                document.querySelectorAll('.quizLink').forEach(l => l.classList.remove('font-bold'));
                this.classList.add('font-bold');
            });
        });
    }

    // Event listener untuk tombol "Tambah Kuis"
    addQuizBtn.addEventListener('click', function () {
        quizForm.reset();
        document.getElementById('quiz_id').value = '';
        // Modal akan dibuka secara otomatis oleh label dengan atribut 'for'
    });

    // Submit form untuk menambah/mengupdate quiz
    quizForm.addEventListener('submit', function (event) {
        event.preventDefault();
        var formData = new FormData(quizForm);
        var quizId = formData.get('quiz_id');

        var url = '/api/admin/quizzes';
        var method = 'POST';

        if (quizId) {
            url += `/${quizId}`;
            method = 'PUT';
        }

        fetch(url, {
            method: method,
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    showToast('Kuis berhasil disimpan.', 'success');
                    hideModal(quizModalToggle);
                    loadQuizzes();
                } else {
                    showToast('Terjadi kesalahan: ' + data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error saving quiz:', error);
                showToast('Terjadi kesalahan saat menyimpan kuis.', 'error');
            });
    });

    // Edit quiz
    function editQuiz(quizId) {
        var quiz = quizzesList.find(q => q.quiz_id == quizId);
        if (quiz) {
            quizForm.reset();
            document.getElementById('quiz_id').value = quiz.quiz_id;
            document.getElementById('title').value = quiz.title;
            document.getElementById('description').value = quiz.description || '';
            showModal(quizModalToggle); // Membuka modal
        } else {
            showToast('Kuis tidak ditemukan.', 'error');
        }
    }

    // Delete quiz
    function deleteQuiz(quizId) {
        showConfirm('Apakah Anda yakin ingin menghapus kuis ini? Semua pertanyaan dan data terkait akan dihapus.', function () {
            fetch(`/api/admin/quizzes/${quizId}`, {
                method: 'DELETE'
            })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        showToast('Kuis berhasil dihapus.', 'success');
                        loadQuizzes();
                        if (selectedQuizId == quizId) {
                            questionTableBody.innerHTML = '';
                            addQuestionBtn.disabled = true;
                            selectedQuizId = null;
                        }
                    } else {
                        showToast('Terjadi kesalahan: ' + data.message, 'error');
                    }
                })
                .catch(error => {
                    console.error('Error deleting quiz:', error);
                    showToast('Terjadi kesalahan saat menghapus kuis.', 'error');
                });
        });
    }

    // --- Manajemen Pertanyaan ---

    // Fetch and display questions for selected quiz
    function loadQuestions(quizId) {
        fetch(`/api/admin/questions/${quizId}`)
            .then(response => response.json())
            .then(data => {
                questionsList = data.questions.map(q => ({
                    question_id: q.question_id,
                    question_text: q.question_text,
                    question_type: q.question_type,
                    options: parseOptions(q.option_ids, q.option_texts, q.is_corrects)
                }));
                renderQuestions();
            })
            .catch(error => {
                console.error('Error fetching questions:', error);
                showToast('Terjadi kesalahan saat memuat data pertanyaan.', 'error');
            });
    }

    // Parse opsi dari hasil API
    function parseOptions(option_ids, option_texts, is_corrects) {
        if (!option_ids) return [];
        var ids = option_ids.split(',');
        var texts = option_texts.split('|');
        var corrects = is_corrects.split(',');
        var options = ids.map((id, index) => ({
            option_id: id,
            option_text: texts[index],
            is_correct: corrects[index] === '1'
        }));
        return options;
    }

    // Render pertanyaan ke tabel
    function renderQuestions() {
        questionTableBody.innerHTML = '';
        if (questionsList.length === 0) {
            var row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="3" class="text-center">Tidak ada pertanyaan yang ditemukan.</td>
            `;
            questionTableBody.appendChild(row);
            return;
        }
        questionsList.forEach(question => {
            var row = document.createElement('tr');

            row.innerHTML = `
                <td>${question.question_text}</td>
                <td>${capitalizeFirstLetter(question.question_type.replace('_', ' '))}</td>
                <td>
                    <button class="btn btn-sm btn-primary editQuestionBtn" data-id="${question.question_id}">
                        <i class="fas fa-edit mr-2"></i>Edit
                    </button>
                    <button class="btn btn-sm btn-error deleteQuestionBtn" data-id="${question.question_id}">
                        <i class="fas fa-trash-alt mr-2"></i>Hapus
                    </button>
                </td>
            `;
            questionTableBody.appendChild(row);
        });
        attachQuestionEventListeners();
    }

    function attachQuestionEventListeners() {
        // Edit Question Buttons
        document.querySelectorAll('.editQuestionBtn').forEach(btn => {
            btn.addEventListener('click', function () {
                var questionId = this.getAttribute('data-id');
                editQuestion(questionId);
            });
        });

        // Delete Question Buttons
        document.querySelectorAll('.deleteQuestionBtn').forEach(btn => {
            btn.addEventListener('click', function () {
                var questionId = this.getAttribute('data-id');
                deleteQuestion(questionId);
            });
        });
    }

    // Event listener untuk tombol "Tambah Pertanyaan"
    addQuestionBtn.addEventListener('click', function () {
        if (!selectedQuizId) {
            showToast('Silakan pilih kuis terlebih dahulu.', 'warning');
            return;
        }
        questionForm.reset();
        document.getElementById('question_id').value = '';
        document.getElementById('question_type').value = 'multiple_choice';
        optionsContainer.classList.remove('hidden');
        optionsList.innerHTML = '';
        addOption();
        addOption();
        showModal(questionModalToggle); // Membuka modal
    });

    // Change event untuk tipe pertanyaan
    document.getElementById('question_type').addEventListener('change', function () {
        if (this.value === 'multiple_choice') {
            optionsContainer.classList.remove('hidden');
            if (optionsList.innerHTML.trim() === '') {
                addOption();
                addOption();
            }
        } else {
            optionsContainer.classList.add('hidden');
            optionsList.innerHTML = '';
        }
    });

    // Event listener untuk tombol "Tambah Opsi"
    addOptionBtn.addEventListener('click', function () {
        addOption();
    });

    function addOption(option = {}) {
        var optionDiv = document.createElement('div');
        optionDiv.classList.add('flex', 'items-center', 'space-x-2');
        optionDiv.innerHTML = `
            <input type="checkbox" name="is_correct" class="checkbox">
            <input type="text" name="option_text" class="input input-bordered flex-1" value="${option.option_text || ''}" required>
            <button type="button" class="btn btn-square btn-error removeOptionBtn">
                <i class="fas fa-trash"></i>
            </button>
        `;
        optionsList.appendChild(optionDiv);

        // Event listener untuk menghapus opsi
        optionDiv.querySelector('.removeOptionBtn').addEventListener('click', function () {
            optionDiv.remove();
        });

        // Jika sedang mengedit dan opsi ini benar, tandai checkbox
        if (option.is_correct) {
            optionDiv.querySelector('input[name="is_correct"]').checked = true;
        }
    }

    // Submit form untuk menambah/mengupdate pertanyaan
    questionForm.addEventListener('submit', function (event) {
        event.preventDefault();
        var formData = new FormData(questionForm);
        var questionId = formData.get('question_id');

        var questionType = formData.get('question_type');
        var questionText = formData.get('question_text').trim();

        // Validasi
        if (questionType === 'multiple_choice') {
            var optionTexts = Array.from(document.querySelectorAll('input[name="option_text"]')).map(input => input.value.trim());
            var isCorrects = Array.from(document.querySelectorAll('input[name="is_correct"]:checked')).map(checkbox => {
                return Array.from(document.querySelectorAll('input[name="is_correct"]')).indexOf(checkbox).toString();
            });

            if (optionTexts.length < 2) {
                showToast('Minimal harus ada 2 opsi jawaban untuk pertanyaan pilihan ganda.', 'warning');
                return;
            }

            // Pastikan tidak ada opsi yang kosong
            if (optionTexts.some(text => text === '')) {
                showToast('Semua opsi jawaban harus diisi.', 'warning');
                return;
            }

            // Pastikan ada minimal satu opsi yang benar
            if (isCorrects.length < 1) {
                showToast('Minimal harus ada satu opsi jawaban yang benar.', 'warning');
                return;
            }
        }

        // Buat objek data
        var data = {
            quiz_id: selectedQuizId,
            question_text: questionText,
            question_type: questionType
        };

        if (questionType === 'multiple_choice') {
            data.options = optionTexts;
            data.is_correct = isCorrects;
        }

        var url = '/api/admin/questions';
        var method = 'POST';

        if (questionId) {
            url += `/${questionId}`;
            method = 'PUT';
        }

        // Konversi data menjadi FormData
        var sendData = new FormData();
        for (var key in data) {
            if (Array.isArray(data[key])) {
                data[key].forEach(item => sendData.append(key, item));
            } else {
                sendData.append(key, data[key]);
            }
        }

        fetch(url, {
            method: method,
            body: sendData
        })
            .then(response => response.json())
            .then(dataResponse => {
                if (dataResponse.status === 'success') {
                    showToast('Pertanyaan berhasil disimpan.', 'success');
                    hideModal(questionModalToggle);
                    loadQuestions(selectedQuizId);
                } else {
                    showToast('Terjadi kesalahan: ' + dataResponse.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error saving question:', error);
                showToast('Terjadi kesalahan saat menyimpan pertanyaan.', 'error');
            });
    });

    // Edit question
    function editQuestion(questionId) {
        var question = questionsList.find(q => q.question_id == questionId);
        if (question) {
            questionForm.reset();
            document.getElementById('question_id').value = question.question_id;
            document.getElementById('question_text').value = question.question_text;
            document.getElementById('question_type').value = question.question_type;

            if (question.question_type === 'multiple_choice') {
                optionsContainer.classList.remove('hidden');
                optionsList.innerHTML = '';
                if (question.options && question.options.length > 0) {
                    question.options.forEach(option => {
                        addOption(option);
                    });
                } else {
                    // Jika tidak ada opsi, tambahkan dua opsi kosong
                    addOption();
                    addOption();
                }
            } else {
                optionsContainer.classList.add('hidden');
                optionsList.innerHTML = '';
            }
            showModal(questionModalToggle); // Membuka modal
        } else {
            showToast('Pertanyaan tidak ditemukan.', 'error');
        }
    }

    // Delete question
    function deleteQuestion(questionId) {
        showConfirm('Apakah Anda yakin ingin menghapus pertanyaan ini?', function () {
            fetch(`/api/admin/questions/${questionId}`, {
                method: 'DELETE'
            })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        showToast('Pertanyaan berhasil dihapus.', 'success');
                        loadQuestions(selectedQuizId);
                    } else {
                        showToast('Terjadi kesalahan: ' + data.message, 'error');
                    }
                })
                .catch(error => {
                    console.error('Error deleting question:', error);
                    showToast('Terjadi kesalahan saat menghapus pertanyaan.', 'error');
                });
        });
    }

    // --- Confirm Modal ---
    function showConfirm(message, onConfirm) {
        // Buat modal konfirmasi menggunakan DaisyUI
        var confirmModal = document.createElement('div');
        confirmModal.className = 'modal modal-open';
        confirmModal.innerHTML = `
            <div class="modal-box">
                <h3 class="font-bold text-lg">Konfirmasi</h3>
                <p class="py-4">${message}</p>
                <div class="modal-action">
                    <button class="btn btn-error">Tidak</button>
                    <button class="btn btn-primary">Ya</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModal);

        // Tambahkan event listener
        confirmModal.querySelector('.btn-error').addEventListener('click', function () {
            confirmModal.remove();
        });

        confirmModal.querySelector('.btn-primary').addEventListener('click', function () {
            confirmModal.remove();
            onConfirm();
        });
    }

    // --- Event Listeners untuk Modal Tutup dan Reset Form ---

    // Event listener untuk reset formulir saat modal tambah atau edit kuis ditutup
    quizModalToggle.addEventListener('change', function () {
        if (!quizModalToggle.checked) {
            quizForm.reset();
            document.getElementById('quiz_id').value = '';
        }
    });

    // Event listener untuk reset formulir saat modal tambah atau edit pertanyaan ditutup
    questionModalToggle.addEventListener('change', function () {
        if (!questionModalToggle.checked) {
            questionForm.reset();
            document.getElementById('question_id').value = '';
            document.getElementById('question_type').value = 'multiple_choice';
            optionsContainer.classList.add('hidden');
            optionsList.innerHTML = '';
        }
    });

    // --- Helper Functions ---
    function capitalizeFirstLetter(string) {
        if (!string) return "";
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Highlight active navigation menu based on current URL
    function highlightActiveMenu() {
        const currentUrl = window.location.pathname;
        const navLinks = document.querySelectorAll('nav:nth-of-type(2) a');

        navLinks.forEach(link => {
            if (link.getAttribute('href') === currentUrl) {
                link.classList.add('bg-primary', 'text-white');
            } else {
                link.classList.remove('bg-primary', 'text-white');
            }
        });
    }

    // --- Initial Load ---
    loadQuizzes();
    highlightActiveMenu();
});
