
import { useMemo, useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  CalendarDays,
  UserRound,
  Trash2,
  X,
  Flame,
  Heart,
} from 'lucide-react';

type Devotional = {
  id: number;
  title: string;
  verse: string;
  reference: string;
  author: string;
  category: string;
  date: string;
  content: string;
};

const initialDevotionals: Devotional[] = [
  {
    id: 1,
    title: 'Confía en Dios en todo momento',
    verse: 'Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia.',
    reference: 'Proverbios 3:5',
    author: 'Equipo juvenil',
    category: 'Fe',
    date: '2026-11-01',
    content: 'Aprendamos a confiar en Dios incluso cuando no entendemos lo que está pasando. Él conoce nuestro camino y tiene cuidado de nosotros.',
  },
  {
    id: 2,
    title: 'Una fe que permanece',
    verse: 'Pero sin fe es imposible agradar a Dios.',
    reference: 'Hebreos 11:6',
    author: 'Equipo juvenil',
    category: 'Fe',
    date: '2026-11-01',
    content: 'La fe no consiste solamente en palabras. También se demuestra con nuestras decisiones y nuestra manera de vivir cada día.',
  },
  {
    id: 3,
    title: 'Jóvenes con propósito',
    verse: 'Ninguno tenga en poco tu juventud.',
    reference: '1 Timoteo 4:12',
    author: 'Equipo juvenil',
    category: 'Juventud',
    date: '2026-11-01',
    content: 'Dios puede usar nuestra juventud para hacer grandes cosas. Seamos ejemplo en palabra, conducta, amor, espíritu, fe y pureza.',
  },
];

export default function DevotionalsPage() {
  const [devotionals, setDevotionals] = useState(initialDevotionals);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [selected, setSelected] = useState<Devotional | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [verse, setVerse] = useState('');
  const [reference, setReference] = useState('');
  const [author, setAuthor] = useState('');
  const [newCategory, setNewCategory] = useState('Fe');
  const [content, setContent] = useState('');

  const categories = ['Todos', 'Fe', 'Oración', 'Juventud', 'Amor', 'Servicio'];

  const filtered = useMemo(() => {
    return devotionals.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.reference.toLowerCase().includes(search.toLowerCase()) ||
        item.content.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        category === 'Todos' || item.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [devotionals, search, category]);

  function addDevotional() {
    if (!title.trim() || !verse.trim() || !reference.trim() || !content.trim()) {
      alert('Completa el título, versículo, referencia y reflexión.');
      return;
    }

    const item: Devotional = {
      id: Date.now(),
      title: title.trim(),
      verse: verse.trim(),
      reference: reference.trim(),
      author: author.trim() || 'Equipo juvenil',
      category: newCategory,
      date: new Date().toISOString().slice(0, 10),
      content: content.trim(),
    };

    setDevotionals((current) => [item, ...current]);
    setTitle('');
    setVerse('');
    setReference('');
    setAuthor('');
    setContent('');
    setShowForm(false);
  }

  function deleteDevotional(id: number) {
    if (!window.confirm('¿Deseas eliminar este devocional?')) return;
    setDevotionals((current) => current.filter((item) => item.id !== id));
    setSelected(null);
  }

  return (
    <main className="devotionals-page">
      <header className="devotionals-hero">
        <div>
          <span className="devotionals-eyebrow">
            <Flame size={15} /> CRECIMIENTO ESPIRITUAL
          </span>
          <h1>Devocionales</h1>
          <p>Alimenta tu fe y fortalece tu relación con Dios cada día.</p>
        </div>

        <button className="devotionals-primary" onClick={() => setShowForm(true)}>
          <Plus size={18} /> Crear devocional
        </button>
      </header>

      <section className="devotionals-feature">
        <div className="devotionals-feature-icon"><BookOpen size={28} /></div>
        <div>
          <span>PALABRA PARA HOY</span>
          <h2>Crece en la presencia de Dios</h2>
          <p>Dedica tiempo a su Palabra, fortalece tu fe y permite que Él guíe tus pasos.</p>
        </div>
      </section>

      <section className="devotionals-controls">
        <div className="devotionals-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar devocionales..."
          />
        </div>

        <div className="devotionals-categories">
          {categories.map((item) => (
            <button
              key={item}
              className={category === item ? 'active' : ''}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="devotionals-grid">
        {filtered.map((item) => (
          <article className="devotional-card" key={item.id}>
            <div className="devotional-card-top">
              <span className="devotional-category">{item.category}</span>
              <Heart size={18} />
            </div>

            <h3>{item.title}</h3>

            <blockquote>
              “{item.verse}”
            </blockquote>

            <strong className="devotional-reference">{item.reference}</strong>

            <p className="devotional-preview">{item.content}</p>

            <div className="devotional-card-footer">
              <span><CalendarDays size={14} /> {item.date}</span>
              <button onClick={() => setSelected(item)}>Leer reflexión</button>
            </div>
          </article>
        ))}

        {filtered.length === 0 && (
          <div className="devotionals-empty">
            <BookOpen size={35} />
            <h3>No hay devocionales</h3>
            <p>Intenta con otra búsqueda o categoría.</p>
          </div>
        )}
      </section>

      {selected && (
        <div className="devotionals-overlay">
          <section className="devotionals-modal">
            <div className="devotionals-modal-header">
              <span className="devotional-category">{selected.category}</span>
              <button onClick={() => setSelected(null)}><X /></button>
            </div>

            <h2>{selected.title}</h2>
            <blockquote>“{selected.verse}”</blockquote>
            <strong>{selected.reference}</strong>
            <p className="devotional-full-content">{selected.content}</p>

            <div className="devotional-author">
              <UserRound size={16} /> {selected.author}
            </div>

            <button
              className="devotional-remove"
              onClick={() => deleteDevotional(selected.id)}
            >
              <Trash2 size={16} /> Eliminar devocional
            </button>
          </section>
        </div>
      )}

      {showForm && (
        <div className="devotionals-overlay">
          <section className="devotionals-modal">
            <div className="devotionals-modal-header">
              <div>
                <h2>Nuevo devocional</h2>
                <p>Comparte una enseñanza bíblica.</p>
              </div>
              <button onClick={() => setShowForm(false)}><X /></button>
            </div>

            <label>Título</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título del devocional" />

            <label>Versículo bíblico</label>
            <textarea value={verse} onChange={(event) => setVerse(event.target.value)} rows={2} placeholder="Escribe el versículo..." />

            <label>Referencia bíblica</label>
            <input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ejemplo: Juan 3:16" />

            <label>Autor</label>
            <input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Nombre del autor" />

            <label>Categoría</label>
            <select value={newCategory} onChange={(event) => setNewCategory(event.target.value)}>
              {categories.filter((item) => item !== 'Todos').map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <label>Reflexión</label>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={5} placeholder="Escribe la reflexión y enseñanza..." />

            <button className="devotionals-primary" onClick={addDevotional}>
              <Plus size={17} /> Publicar devocional
            </button>
          </section>
        </div>
      )}

      <p className="devotionals-notice">
        Los devocionales creados en esta versión son temporales y no se guardan en Firebase.
      </p>
    </main>
  );
}
