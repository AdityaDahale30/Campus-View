import goldBadge from "../gold.jpg";
import silverBadge from "../silver.jpg";
import bronzeBadge from "../bronze.jpg";

function StudentBadge({ badgeData }) {
  if (!badgeData) return null;

  const getBadgeImage = () => {
    if (badgeData.badge === "gold") return goldBadge;
    if (badgeData.badge === "silver") return silverBadge;
    if (badgeData.badge === "bronze") return bronzeBadge;
    return goldBadge;
  };

  return (
    <div className="student-badge-box">
      <img
        src={getBadgeImage()}
        alt={badgeData.badge}
        className="student-badge-img"
      />
    </div>
  );
}

export default StudentBadge;