document.addEventListener('DOMContentLoaded', function () {
    const urlParts = window.location.pathname.split('/');
    const quizId = urlParts[3];
    const historyId = urlParts[4];

    function loadResults() {
        const progressAlert = document.getElementById('progressAlert');
        const totalScoreElem = document.getElementById('total_score');
        const mcScoreElem = document.getElementById('mc_score');
        const essayScoreElem = document.getElementById('essay_score');
        const resultsContainer = document.getElementById('resultsContainer');

        progressAlert.classList.remove('hidden');

        fetch(`/api/user/quiz-results/${quizId}/${historyId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('API Response:', data); // Debugging

                // Set skor
                totalScoreElem.textContent = data.total_score.toFixed(2);
                mcScoreElem.textContent = data.mc_score.toFixed(2);
                essayScoreElem.textContent = data.essay_score.toFixed(2);

                // Render hasil kuis
                if (!data.user_answers || data.user_answers.length === 0) {
                    resultsContainer.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center">
                                <div class="alert alert-info">
                                    <i class="fas fa-info-circle mr-2"></i>
                                    Tidak ada jawaban yang ditemukan.
                                </div>
                            </td>
                        </tr>
                    `;
                    progressAlert.classList.add('hidden');
                    return;
                }

                // Bersihkan container
                resultsContainer.innerHTML = '';

                data.user_answers.forEach((answer, index) => {
                    let statusBadge = '';
                    let scoreDisplay = '';

                    if (answer.question_type === 'multiple_choice') {
                        const selectedOptionIds = answer.selected_option_ids ? answer.selected_option_ids.split(',').map(id => parseInt(id)) : [];
                        const correctOptionIds = data.correct_options ? data.correct_options[answer.question_id.toString()].map(id => parseInt(id)) : [];

                        const isCorrect = arraysEqual(selectedOptionIds.sort(), correctOptionIds.sort());

                        if (isCorrect) {
                            statusBadge = `
                                <div class="badge badge-success gap-2 flex items-center text-sm sm:text-base md:text-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 stroke-current">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    <span>Benar</span>
                                </div>
                            `;
                        } else {
                            statusBadge = `
                                <div class="badge badge-error gap-2 flex items-center text-sm sm:text-base md:text-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 stroke-current">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                    <span>Salah</span>
                                </div>
                            `;
                        }

                        scoreDisplay = '-';
                    } else if (answer.question_type === 'essay') {
                        if (data.essay_reviews && data.essay_reviews[answer.question_id.toString()]) {
                            const review = data.essay_reviews[answer.question_id.toString()];
                            statusBadge = `
                                <div class="badge badge-success gap-2 flex items-center text-sm sm:text-base md:text-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 stroke-current">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    <span>Sudah Direview</span>
                                </div>
                            `;
                            scoreDisplay = `${review.score.toFixed(2)}%`;
                        } else {
                            statusBadge = `
                                <div class="badge badge-warning gap-2 flex items-center text-sm sm:text-base md:text-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 stroke-current">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                    <span>Belum Direview</span>
                                </div>
                            `;
                            scoreDisplay = '-';
                        }
                    }

                    let answerText = '';
                    if (answer.question_type === 'multiple_choice') {
                        if (answer.selected_option_texts) {
                            const selectedOptionTexts = answer.selected_option_texts.split('|');
                            answerText = selectedOptionTexts.join(', ');
                        } else if (answer.selected_option_ids) {
                            const selectedOptionIds = answer.selected_option_ids.split(',').map(id => parseInt(id));
                            answerText = selectedOptionIds.join(', ');
                        } else {
                            answerText = '-';
                        }
                    } else if (answer.question_type === 'essay') {
                        answerText = answer.answer_text ? answer.answer_text : '-';
                    }

                    const row = `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${answer.question_text}</td>
                            <td>${answerText}</td>
                            <td>${statusBadge}</td>
                            <td>${scoreDisplay}</td>
                        </tr>
                    `;
                    resultsContainer.insertAdjacentHTML('beforeend', row);
                });

                progressAlert.classList.add('hidden');
            })
            .catch(error => {
                console.error('Error fetching quiz results:', error);
                const resultsContainer = document.getElementById('resultsContainer');
                resultsContainer.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">
                            <div class="alert alert-error">
                                <i class="fas fa-exclamation-triangle mr-2"></i>
                                Terjadi kesalahan saat memuat hasil kuis.
                            </div>
                        </td>
                    </tr>
                `;
                progressAlert.classList.add('hidden');
            });
    }

    function arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    // Initial load
    loadResults();
});
