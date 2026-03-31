const { PropTypes } = window;

function Hero({ title, subtitle, className = "react-hero" }) {
  return (
    <section className={className}>
      <div className="banner-overlay"></div>
      <div className="container react-hero-content">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </section>
  );
}

Hero.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  className: PropTypes.string,
};

function SectionTitle({ label, title }) {
  return (
    <div className="section-head react-head">
      <p className="label">{label}</p>
      <h2>{title}</h2>
    </div>
  );
}

SectionTitle.propTypes = {
  label: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
};

function KpiCard({ title, value }) {
  return (
    <article className="react-kpi-card">
      <p>{title}</p>
      <h3>{value}</h3>
    </article>
  );
}

KpiCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

function MetricRow({ name, value }) {
  return (
    <p>
      <span>{name}</span>
      <strong>{value}</strong>
    </p>
  );
}

MetricRow.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

function SimpleList({ title, items, empty }) {
  return (
    <div>
      <h4>{title}</h4>
      <ul className="react-list">
        {items.length > 0 ? items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>) : <li>{empty}</li>}
      </ul>
    </div>
  );
}

SimpleList.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.string).isRequired,
  empty: PropTypes.string.isRequired,
};

window.ResortSiteShared = {
  Hero,
  SectionTitle,
  KpiCard,
  MetricRow,
  SimpleList,
};
