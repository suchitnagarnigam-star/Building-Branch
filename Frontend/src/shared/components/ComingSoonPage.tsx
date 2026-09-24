function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="coming-soon-page">
      <div className="coming-soon-page__card">
        <div className="coming-soon-page__icon">🚧</div>
        <h2 className="coming-soon-page__title">{title}</h2>
        <p className="coming-soon-page__text">
          This module is currently under development and will be available soon.
        </p>
      </div>
    </div>
  );
}

export default ComingSoonPage;
