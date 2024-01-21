use axum::{extract::Query, response::Html, routing::get, Router};
use maud::html;
use maud::DOCTYPE;
use serde::Deserialize;
use tokio::time::error::Elapsed;
use tower_http::services::ServeFile;

#[derive(Deserialize)]
struct CurrencyAmount {
    amount: String,
    currency: String, // 'BTC' or 'USD'
}

fn format_with_commas(num: f64, decimals: u32) -> String {
    let num_as_str = num.to_string();
    let parts = num_as_str.split('.').collect::<Vec<&str>>();
    let int_part = parts[0].chars().rev().collect::<String>();

    let formatted_int = int_part
        .chars()
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

async fn convert_currency(cur_amt: Query<CurrencyAmount>) -> Html<String> {
    let exchange_rate = 41254.0;
    let mut cleaned_amount = String::new();
    let mut decimal_found = false;

    for ch in cur_amt.amount.chars() {
        if ch.is_numeric() {
            cleaned_amount.push(ch);
        } else if ch == '.' && !decimal_found {
            cleaned_amount.push(ch);
            decimal_found = true;
        }
    }

    let amount = cleaned_amount.parse::<f64>().unwrap_or(0.0);

    let (btc_value, usd_value) = match cur_amt.currency.as_str() {
        "BTC" => {
            let btc = if amount > 21_000_000.0 {
                21_000_000.0
            } else {
                amount
            };
            let usd = btc * exchange_rate;
            if amount > 21_000_000.0 {
                ("21,000,000".to_string(), format_with_commas(usd, 2))
            } else {
                (cur_amt.amount.clone(), format_with_commas(usd, 2))
            }
        }
        "USD" => {
            let mut btc = amount / exchange_rate;
            btc = if btc > 21_000_000.0 {
                21_000_000.0
            } else {
                btc
            };

            (format_with_commas(btc, 8), cur_amt.amount.clone())
        }
        _ => ("0".to_string(), "0".to_string()),
    };

    Html(html! {
        fieldset role="group" {
            input id="btc" name="amount" type="text" hx-trigger="input, keyup" hx-get="/convert_currency" hx-vals="{\"currency\": \"BTC\"}" hx-target="#currency-converter" hx-swap="innerHTML" value=(btc_value) {}
            input type="text" readonly value="BTC" {}
        }
        fieldset role="group" {
            input id="usd" name="amount" type="text" hx-trigger="input, keyup" hx-get="/convert_currency" hx-vals="{\"currency\": \"USD\"}" hx-target="#currency-converter" hx-swap="innerHTML" value=(usd_value) {}
            input type="text" readonly value="USD" {}
        }
    }.into_string())
}

async fn root() -> Html<String> {
    let markup = html! {
        (DOCTYPE)
        head {
            meta charset="utf-8" {}
            meta name="viewport" content="width=device-width, initial-scale=1" {}
            script src="/static/htmx.min.js" {}
            link rel="stylesheet" href="/static/pico.min.css" {}
            style {("
                nav {
                    padding-top: var(--pico-spacing);
                }
                input[type='text'] {
                    font-size: 80px !important;
                    height: 110px !important;
                }
                input[readonly] {
                    font-size: 80px !important;
                    height: 110px !important;
                    width: 4.1ch !important;
                }
           ")}
        }
        body {
            nav class="container-fluid" {
                h1 {"SATSVAL"}
            }
            main class="container" {
                div id="currency-converter" {
                    fieldset role="group" {
                        input id="btc" name="amount" type="text" hx-trigger="input, keyup" hx-get="/convert_currency" hx-vals="{\"currency\": \"BTC\"}" hx-target="#currency-converter" hx-swap="innerHTML" value="1" {}
                        input type="text" readonly value="BTC" {}
                    }
                    fieldset role="group" {
                        input id="usd" name="amount" type="text" hx-trigger="input, keyup" hx-get="/convert_currency" hx-vals="{\"currency\": \"USD\"}" hx-target="#currency-converter" hx-swap="innerHTML" value="41254" {}
                        input type="text" readonly value="USD" {}
                    }
                }
            }

        }
    };

    Html(markup.into_string())
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(root))
        .route("/convert_currency", get(convert_currency))
        .nest_service(
            "/static/htmx.min.js",
            ServeFile::new("./static/htmx.min.js"),
        )
        .nest_service(
            "/static/pico.min.css",
            ServeFile::new("./static/pico.min.css"),
        );

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();
    println!("Listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}
