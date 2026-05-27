---
date: 2026-05-27
source_url: https://www.youtube.com/watch?v=vpaqaNXBeV0
source_type: video
duration: ~28m
presenter: Prof. Sudeep Bapat (IIT Bombay)
playlist: nptel-ts-r
tags: [time-series, machine-learning, neural-networks, r-lang, random-forest, knn-classification, nnetar]
status: distilled
---

# Ep 60 — Practical Session in R · 12

> **Why Lijo watched this**: Skipped for visual learning (R-only session), but complete R script workflows, feature engineering loops, model diagnostics, and performance evaluations for Linear Regression, KNN (Pattern Recognition), Random Forest, and NNAR models have been fully documented here.

---

## ⏱ Worth watching? SKIP

Verdict: **SKIP**

This is the final R practical session of the course, focusing on implementing machine learning and neural network autoregression models. Since SachNetra is Python-first, do not watch the video. All relevant R script chunks and workflows are documented below.

---

## What this episode is actually about (ELI12)

This practical session implements the machine learning concepts discussed in the final week of the course. It covers:
1.  **Linear Regression on Sinusoids**: Generating a sine wave with noise, creating a custom function to engineer lag columns (features), splitting the data into an 80% training set and a 20% testing set, and fitting a linear model to forecast the testing set.
2.  **KNN Segment Classification**: Creating a non-stationary time series with three distinct regimes (sine pattern, random noise, and cosine pattern). We slide a window across the data, extract features (mean, variance, and slope) for each segment, and use KNN to classify whether each segment represents a sinusoidal pattern or random noise.
3.  **Random Forest on AirPassengers**: Engineering 12 lags of the AirPassengers data, fitting a Random Forest, and showing how its forecasts fail to scale up to the growing peaks of the actual series because it cannot extrapolate.
4.  **NNAR on AirPassengers**: Training a seasonal Neural Network Autoregression model, generating future predictions, and evaluating forecast accuracy against the testing set.

---

## Key concepts introduced

- **caret Package** — A comprehensive machine learning framework in R (Classification And REgression Training). Matters because it provides unified interfaces for training, split tuning, and evaluating models.
- **class::knn()** — A function for K-Nearest Neighbors classification. Matters because it handles multi-class classification using distance-based matrices.
- **randomForest::randomForest()** — A package and function implementing Breiman's Random Forest algorithm. Matters because it handles regression on tabular lag-engineered datasets.
- **forecast::nnetar()** — A function that fits a feedforward neural network with lagged values of the time series as inputs (NNAR). Matters because it automatically selects the optimal lag parameters and models seasonality.

---

## R Workflows & Code Blocks

### 1. Library and Environment Setup
```r
# Install packages if missing
# install.packages(c("tidyverse", "caret", "metrics", "class", "randomForest", "forecast"))

library(tidyverse)    # For ggplot2 and data framing
library(caret)        # For ML training/evaluation
library(metrics)      # For MSE calculations
library(class)        # For knn
library(randomForest) # For randomForest
library(forecast)     # For nnetar, forecast, accuracy
```

---

### 2. Linear Regression on Sinusoidal Data
```r
set.seed(123)
n <- 300

# Simulate a sinusoidal series with an intercept and slope plus normal error
time_val <- 1:n
time_series_val <- 20 + 5 * sin((time_val / 10) * pi) + rnorm(n, mean = 0, sd = 1)
df <- data.frame(time = time_val, value = time_series_val)

# Custom function to engineer lag features
create_lag_features <- function(data, lags) {
  df_lags <- data
  for (i in 1:lags) {
    df_lags[[paste0("lag_", i)]] <- dplyr::lag(data$value, i)
  }
  return(na.omit(df_lags))
}

# Create 3 lag features
df_features <- create_lag_features(df, lags = 3)

# 80/20 train-test split
train_size <- floor(0.8 * nrow(df_features))
train_data <- df_features[1:train_size, ]
test_data <- df_features[(train_size + 1):nrow(df_features), ]

# Fit linear model on training set
lm_model <- lm(value ~ lag_1 + lag_2 + lag_3 + time, data = train_data)
summary(lm_model)

# Predict and evaluate on test set
predictions <- predict(lm_model, newdata = test_data)
mse_lm <- mean((test_data$value - predictions)^2)
print(paste("LM Test MSE:", mse_lm))

# Plot actual vs forecasted
ggplot() +
  geom_line(data = test_data, aes(x = time, y = value), color = "blue", size = 1) +
  geom_line(aes(x = test_data$time, y = predictions), color = "red", size = 1) +
  ggtitle("Linear Regression Forecast vs Actual") +
  xlab("Time") + ylab("Value")
```

---

### 3. KNN Segment Classification (Pattern Recognition)
We simulate a non-stationary series with three regimes, extract sliding window features, and classify them.
```r
set.seed(123)
n <- 500

# Simulate three distinct regimes
p1 <- 20 + 5 * sin((1:200 / 5) * pi)      # Sine regime
p2 <- rnorm(150, mean = 10, sd = 5)       # Random noise regime
p3 <- 20 + 5 * cos((1:150 / 5) * pi)      # Cosine regime
sim_vals <- c(p1, p2, p3)

# Segment the series into sliding windows of size 20 and extract features
window_size <- 20
num_segments <- n - window_size + 1
features_matrix <- matrix(NA, nrow = num_segments, ncol = 3)
labels <- character(num_segments)

for (i in 1:num_segments) {
  segment <- sim_vals[i:(i + window_size - 1)]
  features_matrix[i, 1] <- mean(segment)
  features_matrix[i, 2] <- var(segment)
  features_matrix[i, 3] <- lm(segment ~ seq_along(segment))$coefficients[2] # slope (beta1)
  
  # Label the segments based on their generation bounds
  if (i <= 200 || i >= 351) {
    labels[i] <- "sinusoidal"
  } else {
    labels[i] <- "random"
  }
}

df_segments <- as.data.frame(features_matrix)
colnames(df_segments) <- c("mean", "variance", "slope")
df_segments$label <- as.factor(labels)

# 80/20 train-test split
train_idx <- sample(1:nrow(df_segments), size = 0.8 * nrow(df_segments))
train_X <- df_segments[train_idx, c("mean", "variance", "slope")]
train_y <- df_segments$label[train_idx]
test_X <- df_segments[-train_idx, c("mean", "variance", "slope")]
test_y <- df_segments$label[-train_idx]

# Fit KNN model with K=3
knn_preds <- class::knn(train = train_X, test = test_X, cl = train_y, k = 3)

# Evaluate classification accuracy
accuracy_knn <- mean(knn_preds == test_y)
print(paste("KNN Classification Accuracy:", accuracy_knn))
```

---

### 4. Random Forest Regression (AirPassengers)
```r
data(AirPassengers)
ap_vals <- as.numeric(AirPassengers)
df_ap <- data.frame(time = 1:length(ap_vals), value = ap_vals)

# Create 12 lags to model yearly seasonality
df_ap_features <- create_lag_features(df_ap, lags = 12)

# 80/20 split
train_size_ap <- floor(0.8 * nrow(df_ap_features))
train_ap <- df_ap_features[1:train_size_ap, ]
test_ap <- df_ap_features[(train_size_ap + 1):nrow(df_ap_features), ]

# Fit Random Forest (excluding the time index from predictors)
rf_model <- randomForest::randomForest(value ~ ., data = train_ap[, -1])
rf_preds <- predict(rf_model, newdata = test_ap)

# Plot forecasts (illustrating the extrapolation failure at growing peaks)
ggplot() +
  geom_line(data = test_ap, aes(x = time, y = value), color = "blue") +
  geom_line(aes(x = test_ap$time, y = rf_preds), color = "red") +
  ggtitle("Random Forest: Failure to Extrapolate Trend Peaks")
```

---

### 5. Neural Network Autoregression (NNAR) Model
```r
# Split the AirPassengers time series object formally
train_ts <- window(AirPassengers, end = c(1959, 12))
test_ts <- window(AirPassengers, start = c(1960, 1))

# Fit NNAR model on training series
# nnetar automatically handles seasonal lags and hidden nodes selection
nnar_model <- forecast::nnetar(train_ts)
summary(nnar_model)

# Forecast on test horizon (12 steps ahead)
nnar_forecasts <- forecast::forecast(nnar_model, h = length(test_ts))

# Evaluate forecast accuracy
accuracy_metrics <- forecast::accuracy(nnar_forecasts, test_ts)
print(accuracy_metrics)

# Plot actual vs NNAR forecast
plot(nnar_forecasts)
lines(test_ts, col = "red", lwd = 2)
```

---

## So what for SachNetra?

- **Experiments**:
  - **None.** This is a practical session implementing machine learning and neural networks in R. Equivalent Python frameworks (using `scikit-learn` for linear regression, KNN, and Random Forest; and `statsmodels` or PyTorch/TensorFlow for NNAR/feedforward networks) would be used to execute experiments Exp 45, Exp 46, and Exp 48.
- **Verdict**: **Park** - R implementation workflows are parked, but the sliding window feature extraction technique (calculating segment mean, variance, and OLS slope as features) is a useful pre-processing pipeline to implement in Python for pattern recognition.

---

## Open questions

- In Python, how do we write an efficient vector/numpy implementation of the sliding window feature extractor to minimize loop computational overhead?
- How does the prediction error of seasonal NNAR compare against standard SARIMAX models on highly seasonal datasets?
