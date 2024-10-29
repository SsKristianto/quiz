from bottle import Bottle, run, template, request, static_file, redirect
import pymysql

app = Bottle()

# Koneksi ke MySQL
db = pymysql.connect(
    host='localhost',
    user='root',
    password='',
    database='quiz_db',
    cursorclass=pymysql.cursors.DictCursor
)

# Mengatur folder static
@app.route('/static/<filepath:path>')
def server_static(filepath):
    return static_file(filepath, root='./static')

# Halaman Utama
@app.route('/')
def index():
    return template('index')

# Halaman Login
@app.route('/login')
def login():
    return template('login')

# Proses Login
@app.post('/login')
def do_login():
    username = request.forms.get('username')
    password = request.forms.get('password')

    with db.cursor() as cursor:
        sql = "SELECT * FROM users WHERE username=%s AND password=%s"
        cursor.execute(sql, (username, password))
        user = cursor.fetchone()

    if user:
        # Set session atau cookie jika diperlukan
        redirect('/dashboard')
    else:
        return template('login', error='Username atau password salah')

# Halaman Dashboard
@app.route('/dashboard')
def dashboard():
    return template('dashboard')

# Jalankan Aplikasi
if __name__ == '__main__':
    run(app, host='localhost', port=8080, debug=True, reloader=True)
