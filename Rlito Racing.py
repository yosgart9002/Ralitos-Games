import tkinter as tk
import random
import winsound

# ======================
# VENTANA
# ======================
ventana = tk.Tk()
ventana.title("Ralitos Racing Speedway 🏁")
ventana.geometry("400x500") # Corregido de versiones anteriores
ventana.resizable(False, False)

# ======================
# CANVAS
# ======================
# Fondo verde bosque para que combine con los árboles
canvas = tk.Canvas(ventana, width=400, height=500, bg="gray94")
canvas.pack()

# ======================
# IMÁGENES
# ======================
try:
    # Árbol más grande (subsample 2 o 3 lo hace ver más grande que 4)
    imagen_arbol = tk.PhotoImage(file="Arbol.png").subsample(2, 2)
    imagen_cono = tk.PhotoImage(file="cono.png").subsample(7, 7)

    imagenes_coches = {
        "Honda Fit": tk.PhotoImage(file="Honda Fit.png").subsample(4, 4),
        "Ferrari": tk.PhotoImage(file="Ferrari.png").subsample(5, 5),
        "Formula 1": tk.PhotoImage(file="Formula 1.png").subsample(5, 5),
        "Porsche": tk.PhotoImage(file="Porsche.png").subsample(6, 6) 
    }
except Exception as e:
    print(f"Error al cargar imágenes: {e}")

imagen_coche = None

# ======================
# VARIABLES
# ======================
velocidad_base = 10
velocidad = velocidad_base
puntaje = 0
record = 0
jugando = False
mov_izq = False
mov_der = False
sonido_musica_activo = False

# ======================
# ELEMENTOS
# ======================
coche = None
obstaculos = []
texto_puntaje = None
lineas_centro = []
bosque_izq = []
bosque_der = []

# ======================
# SONIDO
# ======================
def iniciar_musica():
    global sonido_musica_activo
    if not sonido_musica_activo:
        # Reproducción continua sin necesidad de presionar teclas
        winsound.PlaySound("Music.wav", winsound.SND_FILENAME | winsound.SND_ASYNC | winsound.SND_LOOP)
        sonido_musica_activo = True

def detener_musica():
    global sonido_musica_activo
    if sonido_musica_activo:
        winsound.PlaySound(None, winsound.SND_PURGE)
        sonido_musica_activo = False

# ======================
# CARRETERA Y BOSQUE
# ======================
def dibujar_carretera():
    lineas_centro.clear()
    # Asfalto central
    canvas.create_rectangle(40, 0, 360, 500, fill="gray20", outline="")
    # Líneas blancas laterales
    canvas.create_line(40, 0, 40, 500, fill="white", width=4)
    canvas.create_line(360, 0, 360, 500, fill="white", width=4)
    y = 0
    while y < 500:
        linea = canvas.create_rectangle(195, y, 205, y + 30, fill="yellow", outline="")
        lineas_centro.append(linea)
        y += 50

def crear_bosque():
    bosque_izq.clear()
    bosque_der.clear()
    # Generar árboles muy juntos (cada 30px) para que se encimen
    for y in range(-100, 500, 30):
        # Lado izquierdo (bosque denso)
        arbol_i = canvas.create_image(random.randint(-10, 30), y, image=imagen_arbol)
        bosque_izq.append(arbol_i)
        # Lado derecho (bosque denso)
        arbol_d = canvas.create_image(random.randint(370, 410), y, image=imagen_arbol)
        bosque_der.append(arbol_d)

# ======================
# OBSTÁCULOS
# ======================
def crear_obstaculos():
    obstaculos.clear()
    carriles = [80, 160, 240, 320]
    cantidad = random.choice([2, 3])
    posiciones = random.sample(carriles, cantidad)
    for i, x in enumerate(posiciones):
        cono = canvas.create_image(x, -120 * (i + 1), image=imagen_cono)
        obstaculos.append(cono)

# ======================
# CICLO DE JUEGO
# ======================
def crear_juego():
    global coche, texto_puntaje, puntaje, velocidad, jugando
    canvas.delete("all")
    dibujar_carretera()
    crear_bosque()
    coche = canvas.create_image(200, 420, image=imagen_coche)
    crear_obstaculos()
    puntaje = 0
    velocidad = velocidad_base
    jugando = True
    iniciar_musica()
    texto_puntaje = canvas.create_text(10, 10, anchor="nw", fill="white", 
                                     font=("Arial", 12, "bold"), 
                                     text=f"Puntos: 0 | Nivel: 1 | Récord: {record}")

def animar():
    global puntaje, velocidad
    if not jugando: return

    # Movimiento del coche
    if mov_izq and canvas.coords(coche)[0] > 60: canvas.move(coche, -7, 0)
    if mov_der and canvas.coords(coche)[0] < 340: canvas.move(coche, 7, 0)

    # Movimiento de carretera y árboles para dar sensación de velocidad
    elementos_moviles = lineas_centro + bosque_izq + bosque_der
    for item in elementos_moviles:
        canvas.move(item, 0, velocidad)
        coords = canvas.coords(item)
        if coords[1] > 550: 
            canvas.move(item, 0, -600)

    # Movimiento de obstáculos
    for cono in obstaculos[:]:
        canvas.move(cono, 0, velocidad)
        if canvas.coords(cono)[1] > 520:
            canvas.delete(cono)
            obstaculos.remove(cono)
            if not obstaculos:
                crear_obstaculos()
                puntaje += 1
                velocidad = velocidad_base + (puntaje // 2)
                canvas.itemconfig(texto_puntaje, text=f"Puntos: {puntaje} | Nivel: {puntaje//2+1} | Récord: {record}")
        # Colisión mejorada
        elif abs(canvas.coords(coche)[0] - canvas.coords(cono)[0]) < 45 and \
             abs(canvas.coords(coche)[1] - canvas.coords(cono)[1]) < 45:
            game_over()
            return

    ventana.after(16, animar)

# ======================
# MENÚS
# ======================
def game_over():
    global jugando, record
    jugando = False
    detener_musica()
    winsound.PlaySound("choque.wav", winsound.SND_FILENAME | winsound.SND_ASYNC)
    if puntaje > record: record = puntaje

    # Menú de Game Over con tus colores
    menu_go = tk.Frame(ventana, bg="black", highlightbackground="white", highlightthickness=2)
    menu_go.place(relx=0.5, rely=0.5, anchor="center")

    tk.Label(menu_go, text="💥 GAME OVER 💥", font=("Arial", 20, "bold"), bg="red").pack(pady=10, padx=20)
    tk.Label(menu_go, text=f"Puntaje: {puntaje}", font=("Arial", 14), bg="black", fg="white").pack()
    
    # Botones solicitados: Play Again, Change Car, Exit
    tk.Button(menu_go, text="🔁 Play Again", font=("Arial", 11), width=18, bg="green", 
              command=lambda: [menu_go.destroy(), crear_juego(), animar()]).pack(pady=5)
    tk.Button(menu_go, text="🚗 Change Car", font=("Arial", 11), width=18, bg="yellow", 
              command=lambda: [menu_go.destroy(), mostrar_menu_principal()]).pack(pady=5)
    tk.Button(menu_go, text="❌ Exit", font=("Arial", 11), width=18, bg="#ff6666", 
              command=ventana.destroy).pack(pady=5, padx=20)

def mostrar_menu_principal():
    global preview, btn_confirmar
    canvas.delete("all")
    m_p = tk.Frame(ventana)
    m_p.place(relx=0.5, rely=0.5, anchor="center")
    tk.Label(m_p, text="🚗 Selecciona tu Coche 🏁", font=("Arial", 16, "bold")).pack(pady=10)
    preview = tk.Label(m_p)
    preview.pack(pady=10)
    
    def sel(n):
        preview.config(image=imagenes_coches[n])
        preview.image = imagenes_coches[n]
        btn_confirmar.config(command=lambda: iniciar(n), state="normal", bg="#90ee90")
        btn_confirmar.pack(pady=10)

    def iniciar(n):
        global imagen_coche
        imagen_coche = imagenes_coches[n]
        m_p.destroy()
        crear_juego()
        animar()

    # Los botones ahora incluyen el Porsche automáticamente
    for n in imagenes_coches:
        tk.Button(m_p, text=n, width=20, command=lambda x=n: sel(x)).pack(pady=2)
    btn_confirmar = tk.Button(m_p, text="¡Correr!", state="disabled")

# ======================
# CONTROLES
# ======================
ventana.bind("<KeyPress-Left>", lambda e: globals().update(mov_izq=True))
ventana.bind("<KeyRelease-Left>", lambda e: globals().update(mov_izq=False))
ventana.bind("<KeyPress-Right>", lambda e: globals().update(mov_der=True))
ventana.bind("<KeyRelease-Right>", lambda e: globals().update(mov_der=False))

mostrar_menu_principal()
ventana.mainloop()
