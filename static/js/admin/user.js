// /static/js/admin/user.js

document.addEventListener('DOMContentLoaded', function () {
    // --- Referensi Elemen ---
    var userTableBody = document.getElementById('userTableBody');
    var userModalToggle = document.getElementById('user-modal-toggle');
    var userForm = document.getElementById('userForm');
    var searchButton = document.getElementById('searchButton');
    var searchQuery = document.getElementById('searchQuery');
    var filterAll = document.getElementById('filterAll');
    var filterAdmin = document.getElementById('filterAdmin');
    var filterUser = document.getElementById('filterUser');
    var paginationInfo = document.getElementById('paginationInfo');
    var paginationControls = document.getElementById('paginationControls');
    var toastContainer = document.getElementById('toastContainer');
    var loadingIndicator = document.getElementById('loadingIndicator');
    var addUserBtn = document.getElementById('addUserBtn'); // Tambahkan referensi ke tombol tambah

    var currentPage = 1;
    var totalUsers = 0;
    var usersPerPage = 10;
    var currentFilter = ''; // '' berarti semua

    // Fungsi untuk menampilkan Toast menggunakan DaisyUI
    function showToast(message, type = 'success') {
        var toast = document.createElement('div');
        toast.className = `alert alert-${type} shadow-lg`;
        toast.innerHTML = `
            <div>
                <span>${message}</span>
            </div>
            <div>
                <button class="btn btn-sm btn-ghost">
                    <i class="fas fa-times"></i>
                </button>
            </div>
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

    // Fungsi untuk fetch dan menampilkan pengguna
    function loadUsers(page = 1, query = '', role = '') {
        currentPage = page;
        var url = `/api/admin/users?page=${page}&limit=${usersPerPage}&query=${encodeURIComponent(query)}&role=${encodeURIComponent(role)}`;

        // Debugging: Tampilkan URL di console
        console.log(`Fetching URL: ${url}`);

        // Tampilkan loading
        loadingIndicator.classList.remove('hidden');

        fetch(url)
            .then(response => {
                console.log(`Response Status: ${response.status}`);
                if (!response.ok) {
                    throw new Error('Gagal mengambil data pengguna.');
                }
                return response.json();
            })
            .then(data => {
                console.log('Data Received:', data);
                userTableBody.innerHTML = '';
                if (data.users.length === 0) {
                    var row = document.createElement('tr');
                    row.innerHTML = `
                        <td colspan="5" class="text-center">Tidak ada pengguna yang ditemukan.</td>
                    `;
                    userTableBody.appendChild(row);
                } else {
                    data.users.forEach(user => {
                        var row = document.createElement('tr');

                        row.innerHTML = `
                            <td>${user.username}</td>
                            <td>${user.email}</td>
                            <td>${capitalizeFirstLetter(user.role)}</td>
                            <td>${formatTimestamp(user.created_at)}</td>
                            <td class="text-right">
                                <button class="editBtn btn btn-sm btn-primary mr-2 flex items-center" data-id="${user.user_id}">
                                    <i class="fas fa-edit mr-1"></i>
                                    <span class="hidden sm:inline">Edit</span>
                                </button>
                                <button class="deleteBtn btn btn-sm btn-error flex items-center" data-id="${user.user_id}">
                                    <i class="fas fa-trash-alt mr-1"></i>
                                    <span class="hidden sm:inline">Hapus</span>
                                </button>
                            </td>
                        `;
                        userTableBody.appendChild(row);
                    });
                }
                attachEventListeners();
                totalUsers = data.total;
                updatePagination();
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Terjadi kesalahan saat memuat data pengguna.', 'error');
            })
            .finally(() => {
                // Sembunyikan loading
                loadingIndicator.classList.add('hidden');
            });
    }

    // Fungsi untuk menambahkan event listener pada tombol Edit dan Hapus
    function attachEventListeners() {
        document.querySelectorAll('.editBtn').forEach(btn => {
            btn.addEventListener('click', function () {
                var userId = this.getAttribute('data-id');
                editUser(userId);
            });
        });

        document.querySelectorAll('.deleteBtn').forEach(btn => {
            btn.addEventListener('click', function () {
                var userId = this.getAttribute('data-id');
                deleteUser(userId);
            });
        });
    }

    // Fungsi untuk submit form tambah/edit pengguna
    userForm.addEventListener('submit', function (event) {
        event.preventDefault();
        var formData = new FormData(userForm);
        var userId = formData.get('user_id');

        var url = '/api/admin/users';
        var method = 'POST';

        if (userId) {
            url += `/${userId}`;
            method = 'PUT';
            // Password tidak wajib saat mengupdate
            if (formData.get('password') === '') {
                formData.delete('password');
            }
        }

        fetch(url, {
            method: method,
            body: formData
        })
            .then(response => response.json().then(data => ({ status: response.status, body: data })))
            .then(obj => {
                if (obj.status === 200 || obj.status === 201) {
                    var action = userId ? 'diupdate' : 'ditambahkan';
                    showToast(`Pengguna berhasil ${action}.`, 'success');
                    userModalToggle.checked = false; // Tutup modal
                    userForm.reset(); // Reset form setelah submit
                    document.getElementById('password').required = true; // Pastikan password diperlukan lagi
                    loadUsers(currentPage, searchQuery.value, currentFilter);
                } else {
                    throw new Error(obj.body.message || 'Terjadi kesalahan.');
                }
            })
            .catch(err => {
                console.error('Error:', err);
                showToast(`Terjadi kesalahan: ${err.message}`, 'error');
            });
    });

    // Fungsi untuk edit pengguna
    function editUser(userId) {
        fetch(`/api/admin/users/${userId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Gagal mengambil data pengguna.');
                }
                return response.json();
            })
            .then(user => {
                userForm.reset(); // Reset form sebelum mengisi data baru
                document.getElementById('user_id').value = user.user_id;
                document.getElementById('username').value = user.username;
                document.getElementById('email').value = user.email;
                document.getElementById('role').value = user.role.toLowerCase(); // Pastikan sesuai format
                document.getElementById('password').value = ''; // Kosongkan password saat edit
                document.getElementById('password').required = false;  // Password tidak wajib saat mengedit
                userModalToggle.checked = true; // Buka modal

                // Debugging: Tampilkan data pengguna yang diambil
                console.log('Editing User:', user);
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Terjadi kesalahan saat mengedit pengguna.', 'error');
            });
    }

    // Fungsi untuk hapus pengguna
    function deleteUser(userId) {
        showConfirm('Apakah Anda yakin ingin menghapus pengguna ini?', function () {
            fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE'
            })
                .then(response => {
                    if (response.status === 200 || response.status === 204) {
                        showToast('Pengguna berhasil dihapus.', 'success');
                        loadUsers(currentPage, searchQuery.value, currentFilter);
                    } else {
                        return response.json().then(data => {
                            throw new Error(data.message || 'Terjadi kesalahan.');
                        });
                    }
                })
                .catch(err => {
                    console.error('Error:', err);
                    showToast(`Terjadi kesalahan: ${err.message}`, 'error');
                });
        });
    }

    // Fungsi untuk menangani konfirmasi hapus pengguna
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

    // Fungsi untuk handle submit search
    searchButton.addEventListener('click', function () {
        var query = searchQuery.value.trim();
        console.log(`Search Button Clicked: Query = "${query}", Role = "${currentFilter}"`);
        loadUsers(1, query, currentFilter);
    });

    // Fungsi untuk handle filter tombol
    filterAll.addEventListener('click', function () {
        currentFilter = '';
        console.log('Filter: Semua');
        loadUsers(1, searchQuery.value, currentFilter);
        setActiveFilterButton(this);
    });

    filterAdmin.addEventListener('click', function () {
        currentFilter = 'admin';
        console.log('Filter: Admin');
        loadUsers(1, searchQuery.value, currentFilter);
        setActiveFilterButton(this);
    });

    filterUser.addEventListener('click', function () {
        currentFilter = 'user';
        console.log('Filter: User');
        loadUsers(1, searchQuery.value, currentFilter);
        setActiveFilterButton(this);
    });

    // Fungsi untuk menandai tombol filter yang aktif
    function setActiveFilterButton(activeButton) {
        // Reset semua tombol
        [filterAll, filterAdmin, filterUser].forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        });
        // Set tombol yang aktif
        activeButton.classList.remove('btn-secondary');
        activeButton.classList.add('btn-primary');
    }

    // Fungsi untuk memperbarui pagination
    function updatePagination() {
        var start = (currentPage - 1) * usersPerPage + 1;
        var end = Math.min(currentPage * usersPerPage, totalUsers);
        paginationInfo.textContent = `Menampilkan ${start}-${end} dari ${totalUsers} pengguna`;

        // Clear existing pagination controls
        paginationControls.innerHTML = '';

        var totalPages = Math.ceil(totalUsers / usersPerPage);
        if (totalPages <= 1) {
            // Tidak perlu menampilkan pagination jika hanya ada 1 halaman
            return;
        }

        // Previous Button
        var prevBtn = document.createElement('button');
        prevBtn.className = 'join-item btn btn-sm';
        prevBtn.textContent = '«';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', function () {
            if (currentPage > 1) {
                loadUsers(currentPage - 1, searchQuery.value, currentFilter);
            }
        });
        paginationControls.appendChild(prevBtn);

        // Page Numbers (Limit to 5 pages for simplicity)
        var maxPagesToShow = 5;
        var startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        var endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        // Adjust startPage jika mendekati akhir
        if (endPage - startPage < maxPagesToShow - 1) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (var i = startPage; i <= endPage; i++) {
            var pageBtn = document.createElement('button');
            pageBtn.className = 'join-item btn btn-sm ' + (i === currentPage ? 'btn-active' : 'btn-secondary');
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', (function (page) {
                return function () {
                    loadUsers(page, searchQuery.value, currentFilter);
                }
            })(i));
            paginationControls.appendChild(pageBtn);
        }

        // Next Button
        var nextBtn = document.createElement('button');
        nextBtn.className = 'join-item btn btn-sm';
        nextBtn.textContent = '»';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', function () {
            if (currentPage < totalPages) {
                loadUsers(currentPage + 1, searchQuery.value, currentFilter);
            }
        });
        paginationControls.appendChild(nextBtn);
    }

    // Fungsi untuk memformat timestamp
    function formatTimestamp(timestamp) {
        if (!timestamp) return "-";
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            return "-";
        }
        return date.toLocaleString();
    }

    // Fungsi untuk mengkapitalisasi huruf pertama
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
            }
        });
    }

    // Event listener untuk reset formulir saat modal ditutup
    userModalToggle.addEventListener('change', function () {
        if (!userModalToggle.checked) {
            userForm.reset();
            document.getElementById('user_id').value = '';
            document.getElementById('password').required = true;
        }
    });

    // Event listener untuk reset formulir saat membuka modal tambah
    addUserBtn.addEventListener('click', function () {
        userForm.reset(); // Reset seluruh form
        document.getElementById('user_id').value = ''; // Pastikan user_id kosong
        document.getElementById('password').required = true; // Password diperlukan saat tambah
    });

    // --- Initial Load ---
    loadUsers();
    highlightActiveMenu();
});
