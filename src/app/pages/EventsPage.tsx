import WeeklyActivitiesPanel from './WeeklyActivitiesPanel';

export default function EventsPage() {
  return (
    <main className="events-page">
      <header className="management-header">
        <div>
          <span className="management-kicker">VIDA DE LA COMUNIDAD</span>
          <h1>Agenda y eventos</h1>
          <p>Organiza encuentros, reuniones y actividades que aparecerán directamente en el portal de los jóvenes.</p>
        </div>
      </header>
      <WeeklyActivitiesPanel />
    </main>
  );
}
