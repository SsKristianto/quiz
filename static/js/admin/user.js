// static/js/admin/user.js

document.addEventListener('DOMContentLoaded', function() {
    var userTableBody = document.getElementById('userTableBody');
    var addUserBtn = document.getElementById('addUserBtn');
    var userModal = document.getElementById('userModal');
    var userForm = document.getElementById('userForm');
    var cancelBtn = document.getElementById('cancelBtn');

    // Fetch and display users
    function loadUsers() {
        fetch('/api/admin/users')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Gagal mengambil data pengguna.');
                }
                return response.json();
            })
            .then(data => {
                userTableBody.innerHTML = '';
                data.users.forEach(user => {
                    var row = document.createElement('tr');

                    row.innerHTML = `
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>${user.role}</td>
                        <td>${user.created_at}</td>
                        <td>
                            <button class="editBtn" data-id="${user.user_id}">Edit</button>
                            <button class="deleteBtn" data-id="${user.user_id}">Hapus</button>
                        </td>
                    `;
                    userTableBody.appendChild(row);
                });
                attachEventListeners();
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Terjadi kesalahan saat memuat data pengguna.');
            });
    }

    // Attach event listeners to buttons
    function attachEventListeners() {
        document.querySelectorAll('.editBtn').forEach(btn => {
            btn.addEventListener('click', function() {
                var userId = this.getAttribute('data-id');
                editUser(userId);
            });
        });

        document.querySelectorAll('.deleteBtn').forEach(btn => {
            btn.addEventListener('click', function() {
                var userId = this.getAttribute('data-id');
                deleteUser(userId);
            });
        });
    }

    // Show modal for adding user
    addUserBtn.addEventListener('click', function() {
        userForm.reset();
        document.getElementById('user_id').value = '';
        document.getElementById('password').required = true;  // Set password as required for adding
        userModal.style.display = 'block';
    });

    // Hide modal
    cancelBtn.addEventListener('click', function() {
        userModal.style.display = 'none';
    });

    // Submit form for adding/updating user
    userForm.addEventListener('submit', function(event) {
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
        .then(response => response.json().then(data => ({status: response.status, body: data})))
        .then(obj => {
            if (obj.status === 200 || obj.status === 201) {
                alert('Pengguna berhasil disimpan.');
                userModal.style.display = 'none';
                loadUsers();
            } else {
                throw new Error(obj.body.message || 'Terjadi kesalahan.');
            }
        })
        .catch(err => {
            console.error('Error:', err);
            alert('Terjadi kesalahan: ' + err.message);
        });
    });

    // Edit user
    function editUser(userId) {
        fetch(`/api/admin/users`)
            .then(response => response.json())
            .then(data => {
                var user = data.users.find(u => u.user_id == userId);
                if (user) {
                    userForm.reset();
                    document.getElementById('user_id').value = user.user_id;
                    document.getElementById('username').value = user.username;
                    document.getElementById('email').value = user.email;
                    document.getElementById('role').value = user.role;
                    document.getElementById('password').required = false;  // Password tidak wajib saat mengedit
                    userModal.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Terjadi kesalahan saat mengedit pengguna.');
            });
    }

    // Delete user
    function deleteUser(userId) {
        if (confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
            fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE'
            })
            .then(response => response.json().then(data => ({status: response.status, body: data})))
            .then(obj => {
                if (obj.status === 200 || obj.status === 204) {
                    alert('Pengguna berhasil dihapus.');
                    loadUsers();
                } else {
                    throw new Error(obj.body.message || 'Terjadi kesalahan.');
                }
            })
            .catch(err => {
                console.error('Error:', err);
                alert('Terjadi kesalahan: ' + err.message);
            });
        }
    }

    // Initial load
    loadUsers();
});
