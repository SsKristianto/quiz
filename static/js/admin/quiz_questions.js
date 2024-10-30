// static/js/admin/quiz_questions.js

document.addEventListener('DOMContentLoaded', function() {
    var quizTableBody = document.getElementById('quizTableBody');
    var addQuizBtn = document.getElementById('addQuizBtn');
    var quizModal = document.getElementById('quizModal');
    var quizForm = document.getElementById('quizForm');
    var cancelQuizBtn = document.getElementById('cancelQuizBtn');
    var modalOverlay = document.getElementById('modalOverlay');

    var questionTableBody = document.getElementById('questionTableBody');
    var addQuestionBtn = document.getElementById('addQuestionBtn');
    var questionModal = document.getElementById('questionModal');
    var questionForm = document.getElementById('questionForm');
    var cancelQuestionBtn = document.getElementById('cancelQuestionBtn');
    var optionsContainer = document.getElementById('optionsContainer');
    var optionsList = document.getElementById('optionsList');
    var addOptionBtn = document.getElementById('addOptionBtn');

    var selectedQuizId = null;

    // --- Helper Functions ---

    function showModal(modal) {
        modal.classList.remove('hidden');
        modalOverlay.style.display = 'block';
    }

    function hideModal(modal) {
        modal.classList.add('hidden');
        modalOverlay.style.display = 'none';
    }

    // --- Manajemen Kuis ---

    // Fetch and display quizzes
    function loadQuizzes() {
        fetch('/api/admin/quizzes')
            .then(response => response.json())
            .then(data => {
                quizTableBody.innerHTML = '';
                data.quizzes.forEach(quiz => {
                    var row = document.createElement('tr');

                    row.innerHTML = `
                        <td><a href="#" class="quizLink" data-id="${quiz.quiz_id}">${quiz.title}</a></td>
                        <td>${quiz.description || ''}</td>
                        <td>
                            <button class="editQuizBtn" data-id="${quiz.quiz_id}">Edit</button>
                            <button class="deleteQuizBtn" data-id="${quiz.quiz_id}">Hapus</button>
                        </td>
                    `;
                    quizTableBody.appendChild(row);
                });
                attachQuizEventListeners();
            })
            .catch(error => {
                console.error('Error fetching quizzes:', error);
            });
    }

    function attachQuizEventListeners() {
        document.querySelectorAll('.editQuizBtn').forEach(btn => {
            btn.addEventListener('click', function() {
                var quizId = this.getAttribute('data-id');
                editQuiz(quizId);
            });
        });

        document.querySelectorAll('.deleteQuizBtn').forEach(btn => {
            btn.addEventListener('click', function() {
                var quizId = this.getAttribute('data-id');
                deleteQuiz(quizId);
            });
        });

        document.querySelectorAll('.quizLink').forEach(link => {
            link.addEventListener('click', function(event) {
                event.preventDefault();
                selectedQuizId = this.getAttribute('data-id');
                loadQuestions(selectedQuizId);
                addQuestionBtn.disabled = false;
            });
        });
    }

    // Show modal for adding quiz
    addQuizBtn.addEventListener('click', function() {
        quizForm.reset();
        document.getElementById('quiz_id').value = '';
        showModal(quizModal);
    });

    // Hide modal
    cancelQuizBtn.addEventListener('click', function() {
        hideModal(quizModal);
    });

    // Submit form for adding/updating quiz
    quizForm.addEventListener('submit', function(event) {
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
                alert('Kuis berhasil disimpan.');
                hideModal(quizModal);
                loadQuizzes();
            } else {
                alert('Terjadi kesalahan: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error saving quiz:', error);
            alert('Terjadi kesalahan saat menyimpan kuis.');
        });
    });

    // Edit quiz
    function editQuiz(quizId) {
        fetch('/api/admin/quizzes')
            .then(response => response.json())
            .then(data => {
                var quiz = data.quizzes.find(q => q.quiz_id == quizId);
                if (quiz) {
                    quizForm.reset();
                    document.getElementById('quiz_id').value = quiz.quiz_id;
                    document.getElementById('title').value = quiz.title;
                    document.getElementById('description').value = quiz.description || '';
                    showModal(quizModal);
                }
            })
            .catch(error => {
                console.error('Error fetching quiz data:', error);
                alert('Terjadi kesalahan saat memuat data kuis.');
            });
    }

    // Delete quiz
    function deleteQuiz(quizId) {
        if (confirm('Apakah Anda yakin ingin menghapus kuis ini? Semua pertanyaan dan data terkait akan dihapus.')) {
            fetch(`/api/admin/quizzes/${quizId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('Kuis berhasil dihapus.');
                    loadQuizzes();
                    questionTableBody.innerHTML = '';
                    addQuestionBtn.disabled = true;
                } else {
                    alert('Terjadi kesalahan: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error deleting quiz:', error);
                alert('Terjadi kesalahan saat menghapus kuis.');
            });
        }
    }

    // --- Manajemen Pertanyaan ---

    // Show modal for adding question
    addQuestionBtn.addEventListener('click', function() {
        if (!selectedQuizId) {
            alert('Silakan pilih kuis terlebih dahulu.');
            return;
        }
        questionForm.reset();
        document.getElementById('question_id').value = '';
        document.getElementById('question_type').value = 'multiple_choice';
        optionsContainer.style.display = 'block';
        optionsList.innerHTML = '';
        addOption();
        addOption();
        showModal(questionModal);
    });

    // Hide modal
    cancelQuestionBtn.addEventListener('click', function() {
        hideModal(questionModal);
    });

    // Change event for question type
    document.getElementById('question_type').addEventListener('change', function() {
        if (this.value === 'multiple_choice') {
            optionsContainer.style.display = 'block';
            if (optionsList.innerHTML.trim() === '') {
                addOption();
                addOption();
            }
        } else {
            optionsContainer.style.display = 'none';
            optionsList.innerHTML = '';
        }
    });

    // Add option
    addOptionBtn.addEventListener('click', function() {
        addOption();
    });

    function addOption(option = {}) {
        var idx = optionsList.children.length;
        var optionDiv = document.createElement('div');
        optionDiv.classList.add('option-item');
        optionDiv.innerHTML = `
            <input type="checkbox" name="is_correct" value="${idx}" ${option.is_correct ? 'checked' : ''}>
            <input type="text" name="options" value="${option.option_text || ''}" required>
            <button type="button" class="removeOptionBtn">Hapus</button>
        `;
        optionsList.appendChild(optionDiv);

        // Event listener untuk menghapus opsi
        optionDiv.querySelector('.removeOptionBtn').addEventListener('click', function() {
            optionDiv.remove();
        });
    }

    // Submit form for adding/updating question
    questionForm.addEventListener('submit', function(event) {
        event.preventDefault();
        var formData = new FormData(questionForm);
        formData.append('quiz_id', selectedQuizId);
        var questionId = formData.get('question_id');

        var url = '/api/admin/questions';
        var method = 'POST';

        if (questionId) {
            url += `/${questionId}`;
            method = 'PUT';
        }

        // Pastikan minimal ada 2 opsi jika multiple_choice
        var questionType = formData.get('question_type');
        if (questionType === 'multiple_choice') {
            var options = formData.getAll('options');
            if (options.length < 2) {
                alert('Minimal harus ada 2 opsi jawaban untuk pertanyaan pilihan ganda.');
                return;
            }
        }

        fetch(url, {
            method: method,
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert('Pertanyaan berhasil disimpan.');
                hideModal(questionModal);
                loadQuestions(selectedQuizId);
            } else {
                alert('Terjadi kesalahan: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error saving question:', error);
            alert('Terjadi kesalahan saat menyimpan pertanyaan.');
        });
    });

    // Load questions for selected quiz
    function loadQuestions(quizId) {
        fetch(`/api/admin/questions/${quizId}`)
            .then(response => response.json())
            .then(data => {
                questionTableBody.innerHTML = '';
                data.questions.forEach(question => {
                    var row = document.createElement('tr');

                    row.innerHTML = `
                        <td>${question.question_text}</td>
                        <td>${question.question_type.replace('_', ' ').toUpperCase()}</td>
                        <td>
                            <button class="editQuestionBtn" data-id="${question.question_id}">Edit</button>
                            <button class="deleteQuestionBtn" data-id="${question.question_id}">Hapus</button>
                        </td>
                    `;
                    questionTableBody.appendChild(row);
                });
                attachQuestionEventListeners();
            })
            .catch(error => {
                console.error('Error fetching questions:', error);
            });
    }

    function attachQuestionEventListeners() {
        document.querySelectorAll('.editQuestionBtn').forEach(btn => {
            btn.addEventListener('click', function() {
                var questionId = this.getAttribute('data-id');
                editQuestion(questionId);
            });
        });

        document.querySelectorAll('.deleteQuestionBtn').forEach(btn => {
            btn.addEventListener('click', function() {
                var questionId = this.getAttribute('data-id');
                deleteQuestion(questionId);
            });
        });
    }

    // Edit question
    function editQuestion(questionId) {
        fetch(`/api/admin/questions/${selectedQuizId}`)
            .then(response => response.json())
            .then(data => {
                var question = data.questions.find(q => q.question_id == questionId);
                if (question) {
                    questionForm.reset();
                    document.getElementById('question_id').value = question.question_id;
                    document.getElementById('question_text').value = question.question_text;
                    document.getElementById('question_type').value = question.question_type;

                    if (question.question_type === 'multiple_choice') {
                        optionsContainer.style.display = 'block';
                        optionsList.innerHTML = '';
                        var option_texts = question.option_texts.split('|');
                        var is_corrects = question.is_corrects.split(',');

                        option_texts.forEach((text, idx) => {
                            addOption({
                                option_text: text,
                                is_correct: is_corrects[idx] === '1'
                            });
                        });
                    } else {
                        optionsContainer.style.display = 'none';
                        optionsList.innerHTML = '';
                    }
                    showModal(questionModal);
                }
            })
            .catch(error => {
                console.error('Error fetching question data:', error);
                alert('Terjadi kesalahan saat memuat data pertanyaan.');
            });
    }


    // Delete question
    function deleteQuestion(questionId) {
        if (confirm('Apakah Anda yakin ingin menghapus pertanyaan ini?')) {
            fetch(`/api/admin/questions/${questionId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('Pertanyaan berhasil dihapus.');
                    loadQuestions(selectedQuizId);
                } else {
                    alert('Terjadi kesalahan: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error deleting question:', error);
                alert('Terjadi kesalahan saat menghapus pertanyaan.');
            });
        }
    }

    // --- Menambahkan Opsi Jawaban ---
    // Sudah ditangani di fungsi addOption()

    // --- Initial Load ---
    loadQuizzes();
});
