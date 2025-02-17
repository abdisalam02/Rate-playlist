import React from "react";
import styles from "./StarRating.module.css";

export default function StarRating({ onRatingSelect }) {
  const handleChange = (e) => {
    const value = parseInt(e.target.value, 10);
    // Add a slight delay to allow the CSS transition to complete
    setTimeout(() => {
      if (onRatingSelect) {
        onRatingSelect(value);
      }
    }, 100);
  };

  return (
    <div className={styles.feedback}>
      <div className={styles.rating}>
        {/* Radio inputs and labels in reverse order */}
        <input type="radio" name="rating" id="rating-5" value="5" onChange={handleChange} />
        <input type="radio" name="rating" id="rating-4" value="4" onChange={handleChange} />
        <input type="radio" name="rating" id="rating-3" value="3" onChange={handleChange} />
        <input type="radio" name="rating" id="rating-2" value="2" onChange={handleChange} />
        <input type="radio" name="rating" id="rating-1" value="1" onChange={handleChange} />
        
        {/* Render the labels in the same order */}
        <div className={styles["star-row"]}>
          <label htmlFor="rating-5"></label>
          <label htmlFor="rating-4"></label>
          <label htmlFor="rating-3"></label>
          <label htmlFor="rating-2"></label>
          <label htmlFor="rating-1"></label>
        </div>
      </div>
    </div>
  );
}
