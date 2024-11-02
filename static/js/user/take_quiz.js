// static/js/user/take_quiz.js

document.addEventListener('DOMContentLoaded', function() {
    var quizForm = document.getElementById('quizForm');
    var quiz_id = document.getElementById('quiz_id').value;
    var questionsContainer = document.getElementById('questionsContainer');

    function loadQuestions() {
        fetch(`/api/user/quiz-questions/${quiz_id}`)
            .then(response => response.json())
            .then(data => {
                questionsContainer.innerHTML = '';
                data.questions.forEach((question, index) => {
                    var questionDiv = document.createElement('div');
                    questionDiv.classList.add('question');
                    questionDiv.innerHTML = `
                        <p>${index + 1}. ${question.question_text}</p>
                    `;

                    if (question.question_type === 'multiple_choice') {
                        var option_texts = question.option_texts ? question.option_texts.split('|') : [];
                        var option_ids = question.option_ids ? question.option_ids.split(',') : [];

                        option_texts.forEach((text, idx) => {
                            var option_id = option_ids[idx];
                            var inputType = 'checkbox'; // Menggunakan checkbox untuk multiple selection
                            var optionDiv = document.createElement('div');
                            optionDiv.innerHTML = `
                                <label>
                                    <input type="${inputType}" name="question_${question.question_id}" value="${option_id}">
                                    ${text}
                                </label>
                            `;
                            questionDiv.appendChild(optionDiv);
                        });
                    } else if (question.question_type === 'essay') {
                        var textarea = document.createElement('textarea');
                        textarea.name = `question_${question.question_id}`;
                        textarea.required = true;
                        questionDiv.appendChild(textarea);
                    }

                    questionsContainer.appendChild(questionDiv);
                });
            })
            .catch(error => {
                console.error('Error fetching questions:', error);
            });
    }

    quizForm.addEventListener('submit', function(event) {
        event.preventDefault();
        var formData = new FormData(quizForm);
        var answers = [];
        var questionDivs = questionsContainer.querySelectorAll('.question');

        questionDivs.forEach(questionDiv => {
            var questionId = questionDiv.querySelector('input, textarea').name.split('_')[1];
            var questionType = questionDiv.querySelector('textarea') ? 'essay' : 'multiple_choice';

            if (questionType === 'multiple_choice') {
                var selectedOptions = [];
                var inputs = questionDiv.querySelectorAll('input[type="checkbox"]');
                inputs.forEach(input => {
                    if (input.checked) {
                        selectedOptions.push(input.value);
                    }
                });
                answers.push({
                    question_id: questionId,
                    question_type: questionType,
                    selected_options: selectedOptions
                });
            } else if (questionType === 'essay') {
                var answerText = questionDiv.querySelector('textarea').value;
                answers.push({
                    question_id: questionId,
                    question_type: questionType,
                    answer_text: answerText
                });
            }
        });

        var payload = {
            quiz_id: quiz_id,
            answers: JSON.stringify(answers)
        };

        fetch('/api/user/submit-quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(payload)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert('Jawaban Anda telah disimpan.');
                window.location.href = `/user/dashboard`;
            } else {
                alert('Terjadi kesalahan: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error submitting quiz:', error);
            alert('Terjadi kesalahan saat mengirim jawaban.');
        });
    });

    // Initial load
    loadQuestions();
});
