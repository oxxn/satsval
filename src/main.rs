use axum::{extract::Query, response::Html, routing::get, Router};
use maud::html;
use maud::DOCTYPE;
use serde::Deserialize;
use tower_http::services::ServeFile;

#[derive(Deserialize)]
struct Amt {
    amt: f64,
}

async fn convert_btc_to_usd(amt: Query<Amt>) -> Html<String> {
    let exchange_rate = 41254.0; // Example exchange rate
    let usd_value = amt.amt * exchange_rate;
    Html(html! {
        input id="usd" name="amt" type="text" hx-trigger="input" hx-get="/convert_usd_to_btc" hx-target="#btc" hx-swap="outerHTML" value=(usd_value) {}
    }.into_string())
}

async fn convert_usd_to_btc(amt: Query<Amt>) -> Html<String> {
    let exchange_rate = 41254.0; // Example exchange rate
    let btc_value = amt.amt / exchange_rate;
    Html(html! {
        input id="btc" name="amt" type="text" hx-trigger="input" hx-get="/convert_btc_to_usd" hx-target="#usd" hx-swap="outerHTML" value=(btc_value) {}
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
