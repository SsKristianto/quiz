// static/js/admin/analytics.js

document.addEventListener('DOMContentLoaded', function() {
    var analyticsContainer = document.getElementById('analyticsContainer');

    function loadAnalytics() {
        fetch('/api/admin/analytics')
            .then(response => response.json())
            .then(data => {
                var analytics = data.analytics;
                analyticsContainer.innerHTML = `
                    <div class="stat">
                        <h3>Total Kuis</h3>
                        <p>${analytics.total_quizzes}</p>
                    </div>
                    <div class="stat">
                        <h3>Pengguna Aktif</h3>
                        <p>${analytics.active_users}</p>
                    </div>
                    <div class="stat">
                        <h3>Skor Rata-rata</h3>
                        <p>${analytics.average_score.toFixed(2)}</p>
                    </div>
                    <div class="stat">
                        <h3>Total Pertanyaan</h3>
                        <p>${analytics.total_questions}</p>
                    </div>
                    <div class="stat">
                        <h3>Jawaban Essay Belum Direview</h3>
                        <p>${analytics.pending_essays}</p>
                    </div>
                `;
            })
            .catch(error => {
                console.error('Error fetching analytics data:', error);
                analyticsContainer.innerHTML = '<p>Terjadi kesalahan saat memuat data analytics.</p>';
            });
    }

    // Initial load
    loadAnalytics();
});
