## 🛡️ Aarthik Kavach: Risk Evaluation Engine Service Doc...

### Metadata
| Field | Value |
| :--- | :--- |
| **Service Owner** | *[Team Member Name]* |
| **Service Name (Code ID)** | *`risk-eval-engine-service`* |
| **Core Technology** | *Node.js (Express)* |
| **Project Priority (1-5, 5=Critical)** | *[1-5]* |

---

### I. 🎯 Functional Mission & Core Responsibility (The "Why")

| **Question** | **Answer / Technical Requirement** |
| :--- | :--- |
| **Q1. What is the precise, single function this service executes?** | *(Define using: **Input -> Transformation -> Output**)* |
| **Q2. Justify this service's existence (Why can't another service absorb this work?).** | *(Focus on separation of concerns, e.g., "Decoupled due to high CPU requirement for NLP.")* |
| **Q3. Which core RPN Factor (S, P, or D) or Application Feature (Report, Chat, Viz) is the primary consumer?** | *[e.g., Primary feeder for Probability (P)]* |

---

### II. 🔌 Dependencies & Data Contracts (LLD & SOLID Principles)

| **Question** | **Answer / Technical Requirement** |
| :--- | :--- |
| **Q4. What are your essential *input* dependencies?** | *(List all upstream services/APIs/Kafka Topics you **read** from. Specify data source/protocol.)* |
| **Q5. What are your essential *output* dependencies?** | *(List all downstream services/topics/DBs you **write** to. Specify data destination/protocol.)* |
| **Q6. Define your core *output* data contract/schema.** | *(List the top 5 fields, their **Data Type**, and **Unit**.)* |
| **Q7. Data Normalization/Validation Strategy.** | *(How do you ensure data integrity? E.g., JSON schema validation, conversion rules for external data.)* |
| **Q8. Suggested Approach: Standard Libraries/Frameworks.** | *(Recommend specific libraries for this service: e.g., For News Service, recommend `Axios` for REST calls and `NLTK` for NLP.)* |

---

### III. 💥 Failure Analysis & Resilience (Point of Failure)

| **Question** | **Answer / Technical Requirement** |
| :--- | :--- |
| **Q9. What are the top 3 critical **Points of Failure** for this service?** | *(Focus on external API limits, internal processing memory/CPU, or DB connectivity.)* |
| **Q10. What is the specific, engineered **Recovery/Fallback** mechanism for *each* failure mode identified above?** | *(e.g., For API limit: **Circuit Breaker** pattern $\to$ Use **Redis Cache** for 1 hour $\to$ Log failure.)* |
| **Q11. Technical Challenge: Data Staleness.** | *(How do you ensure the data you provide is "live enough" for RPN? Define the acceptable latency/TTL.)* |
| **Q12. Technical Challenge: Race Conditions.** | *(If applicable, how is concurrent writing/reading managed? E.g., Using DB transactions, optimistic locking, or queue sequencing.)* |

---

### IV. 🚀 Deployment, Scaling, & Security (Architectural Standards)

| **Question** | **Answer / Technical Requirement** |
| :--- | :--- |
| **Q13. Deployment Environment Rationale.** | *(Why is your chosen tech best for this deployment? E.g., "Python/Celery for **Risk Eval Engine** runs best on a compute-optimized GCP VM.")* |
| **Q14. Scaling Strategy Rationale.** | *(How will you scale? E.g., Horizontal scaling via **Kubernetes/GCP Managed Instance Groups** based on Kafka queue depth.)* |
| **Q15. Estimated Maximum Load (TPS/CPM) & Concurrency.** | *[Target throughput (TPS) $\&$ max simultaneous requests]* |
| **Q16. Highest Level of Sensitive Data Handled (P1-P4).** | *[P4 (Sensitive/PII) requires mandatory controls, e.g., user tokens.]* |
| **Q17. Suggested Approach: Security/Monitoring.** | *(Recommend specific tools/practices: e.g., **OWASP TOP 10** checks, **Prometheus/Grafana** for observability, Secret Manager for credentials.)* |