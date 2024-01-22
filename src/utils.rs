use reqwest;
use serde_json;
use std::sync::Mutex;
use std::time::{Duration, Instant};

static LAST_FETCHED: Mutex<Option<(f64, Instant)>> = Mutex::new(None);

pub fn truncate_decimal_part(input: &str) -> String {
    let parts = input.split('.').collect::<Vec<&str>>();

    match parts.as_slice() {
        [int_part, decimal_part] => {
            let truncated_decimal = &decimal_part[..decimal_part.len().min(8)];
            format!("{}.{}", int_part, truncated_decimal)
        }
        _ => input.to_string(),
    }
}

pub fn format_with_commas(num: f64, decimals: u32) -> String {
    let num_as_str = num.to_string();
    let parts = num_as_str.split('.').collect::<Vec<&str>>();
    let int_part = parts[0];

    let formatted_int = int_part
        .chars()
        .rev()
        .enumerate()
        .fold(String::new(), |mut acc, (i, c)| {
            if i % 3 == 0 && i != 0 {
                acc.push(',');
            }
            acc.push(c);
            acc
        })
        .chars()
        .rev()
        .collect::<String>();

    let decimal_part = if parts.len() > 1 {
        let dec = parts[1].chars().take(decimals as usize).collect::<String>();
        if !dec.is_empty() {
            format!(".{}", dec)
        } else {
            String::new()
        }
    } else {
        String::new()
    };

    format!("{}{}", formatted_int, decimal_part)
}

pub async fn fetch_exchange_rate() -> Result<f64, reqwest::Error> {
    let mut last_fetched = LAST_FETCHED.lock().unwrap();
    if let Some((rate, time)) = *last_fetched {
        if time.elapsed() < Duration::new(3, 0) {
            return Ok(rate);
        }
    }

    let url = "https://api.coinbase.com/v2/exchange-rates?currency=BTC";
    let client = reqwest::Client::new();
    let res = client.get(url).send().await?;

    // Parse the JSON and extract the exchange rate
    // Assuming USD is the required exchange rate
    let json: serde_json::Value = res.json().await?;
    let rate = json["data"]["rates"]["USD"]
        .as_str()
        .unwrap_or("0")
        .parse()
        .unwrap_or(0.0);

    *last_fetched = Some((rate, Instant::now()));
    Ok(rate)
}
