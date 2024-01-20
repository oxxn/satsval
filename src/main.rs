use axum::{extract::Query, response::Html, routing::get, Router};
use maud::html;
use maud::DOCTYPE;
use serde::Deserialize;
use tower_http::services::ServeFile;

#[derive(Deserialize)]
struct Amt {
    amt: String,
}

fn parse_amount(amt_str: &str) -> f64 {
    amt_str.parse::<f64>().unwrap_or(0.0)
}

fn format_amount(amount: f64, decimal_places: usize) -> String {
    let integer_part = amount.trunc() as i64;
    let fractional_part = amount.fract();

    let mut formatted_integer = format!("{}", integer_part)
        .chars()
        .rev()
        .collect::<Vec<_>>()
        .chunks(3)
        .map(|chunk| chunk.iter().collect::<String>())
        .collect::<Vec<_>>()
        .join(",")
        .chars()
        .rev()
        .collect::<String>();

    if formatted_integer.starts_with('-') && formatted_integer.chars().nth(1) == Some(',') {
        formatted_integer.remove(1);
    }

    let formatted_fractional = format!("{:.*}", decimal_places, fractional_part.abs());

    format!("{}.{}", formatted_integer, &formatted_fractional[2..])
}

async fn convert_btc_to_usd(amt: Query<Amt>) -> Html<String> {
    let exchange_rate = 41254.0;
    let usd_value = parse_amount(&amt.amt) * exchange_rate;
    let formatted_usd = format_amount(usd_value, 8);
    Html(html! {
        input id="usd" name="amt" type="text" hx-trigger="input" hx-get="/convert_usd_to_btc" hx-target="#btc" hx-swap="outerHTML" value=(formatted_usd) {}
    }.into_string())
}

async fn convert_usd_to_btc(amt: Query<Amt>) -> Html<String> {
    let exchange_rate = 41254.0;
    let mut btc_value = parse_amount(&amt.amt) / exchange_rate;
    btc_value = btc_value.min(21_000_000.0);
    let formatted_btc = format_amount(btc_value, 8);
    Html(html! {
        input id="btc" name="amt" type="text" hx-trigger="input" hx-get="/convert_btc_to_usd" hx-target="#usd" hx-swap="outerHTML" value=(formatted_btc) {}
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
                fieldset role="group" {
                    input id="btc" name="amt" type="text" hx-trigger="input" hx-get="/convert_btc_to_usd" hx-target="#usd" hx-swap="outerHTML" value="1" {}
                    input type="text" readonly value="BTC" {}
                }
                fieldset role="group" {
                    input id="usd" name="amt" type="text" hx-trigger="input" hx-get="/convert_usd_to_btc" hx-target="#btc" hx-swap="outerHTML" value="41254" {}
                    input type="text" readonly value="USD" {}
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
        .route("/convert_btc_to_usd", get(convert_btc_to_usd))
        .route("/convert_usd_to_btc", get(convert_usd_to_btc))
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
