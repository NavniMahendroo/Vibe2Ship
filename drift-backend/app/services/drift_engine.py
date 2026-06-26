import datetime
from sqlalchemy.orm import Session
from ..models import Task

def calculate_drift_score(
    db: Session, 
    user_id: int, 
    title: str, 
    category: str, 
    deadline: datetime.datetime
) -> tuple[int, str]:
    """
    Drift Risk Engine (Deterministic Heuristic - Whiteboard friendly)
    Computes a Drift Probability Score (0-100%) and a plain-English explanation.
    
    Factors:
    1. Category Extension Rate (40%)
    2. Overall User Extension Rate (20%)
    3. Keyword Matching (20%)
    4. Deadline Tightness (20%)
    """
    # Fetch all tasks for this user
    user_tasks = db.query(Task).filter(Task.user_id == user_id).all()
    total_tasks = len(user_tasks)

    # 1. Zero History Fallback
    if total_tasks == 0:
        return 50, "Not enough history yet. We'll learn your patterns as you add tasks."

    now = datetime.datetime.utcnow()
    # Normalize deadline to naive datetime for comparison
    if deadline.tzinfo is not None:
        deadline = deadline.replace(tzinfo=None)

    # Helper: Check if task was extended
    # A task is extended if it has extensions relationship or current_deadline > original_deadline
    def is_task_extended(t: Task) -> bool:
        # Check both the column difference and extensions count if populated
        return (t.current_deadline > t.original_deadline) or (len(t.extensions) > 0)

    # Calculate global statistics
    extended_tasks = [t for t in user_tasks if is_task_extended(t)]
    global_rate = len(extended_tasks) / total_tasks

    # 2. Category Statistics
    category_tasks = [t for t in user_tasks if t.category.lower() == category.lower()]
    category_count = len(category_tasks)
    
    if category_count > 0:
        category_extended = [t for t in category_tasks if is_task_extended(t)]
        category_rate = len(category_extended) / category_count
    else:
        # Default to overall rate if category is brand new
        category_rate = global_rate

    # 3. Title Keyword Statistics
    # Tokenize input title to words with length >= 3 to filter out noise
    input_words = {w.lower() for w in title.split() if len(w) >= 3}
    keyword_match_rates = []
    
    for t in user_tasks:
        task_words = {w.lower() for w in t.title.split() if len(w) >= 3}
        common_words = input_words.intersection(task_words)
        if common_words:
            # If this task had matching words, check if it was extended
            keyword_match_rates.append(1.0 if is_task_extended(t) else 0.0)
            
    if keyword_match_rates:
        keyword_rate = sum(keyword_match_rates) / len(keyword_match_rates)
    else:
        # Default to category rate if no keyword matches
        keyword_rate = category_rate

    # 4. Deadline Tightness
    # Calculate days allocated for this new task
    days_given = (deadline - now).days
    if days_given <= 0:
        days_given = 1  # Minimum 1 day

    # Calculate historical average days given for this category or overall
    historical_days = []
    for t in (category_tasks if category_count > 0 else user_tasks):
        # Time from creation to original deadline represents planned duration
        duration = (t.original_deadline - t.created_at).days
        if duration > 0:
            historical_days.append(duration)
            
    if historical_days:
        avg_historical_days = sum(historical_days) / len(historical_days)
    else:
        avg_historical_days = 5.0  # Default benchmark

    # If days_given is less than average completion time, raise risk
    tightness_factor = 0.5  # Neutral
    if days_given < avg_historical_days:
        # Shorter than average -> high risk (approaches 1.0)
        tightness_factor = 0.5 + (0.5 * (1.0 - (days_given / avg_historical_days)))
    else:
        # Longer than average -> lower risk (approaches 0.0)
        tightness_factor = 0.5 * (avg_historical_days / days_given)

    # Calculate final weighted score (0 - 100)
    # Weights: Category(40%), Global(20%), Keyword(20%), Tightness(20%)
    weighted_score = (
        (category_rate * 40) +
        (global_rate * 20) +
        (keyword_rate * 20) +
        (tightness_factor * 20)
    )
    
    drift_score = int(max(0, min(100, weighted_score)))

    # 5. Formulate plain-English explanation
    category_percentage = int(category_rate * 100)
    
    # Customize the explanation based on the primary drivers
    if category_count > 0 and category_percentage >= 50:
        rec_days = int(max(1, avg_historical_days - days_given))
        explanation = f"You extend {category.lower()} tasks {category_percentage}% of the time. Consider adding {rec_days} day(s)."
    elif tightness_factor > 0.7:
        explanation = f"This deadline ({days_given} days) is tight compared to your historical average of {int(avg_historical_days)} days for similar tasks."
    elif keyword_rate > 0.6 and len(keyword_match_rates) > 0:
        explanation = "Your task title contains keywords historically linked with delayed completion."
    else:
        explanation = f"Based on your profile, you have a {drift_score}% general probability of extending this task's deadline."

    return drift_score, explanation
