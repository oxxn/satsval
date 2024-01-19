use axum::{
    response::Html,
    routing::get,
    Router,
};
use maud::html;
use tower_http::services::ServeFile;

async fn root() -> Html<String> {
    let markup = html! {
        head {
            script src="/include/htmx.min.js" {}
        }
        body {
            h1 { "Hello, World!" }
            p { "This is a simple web app using Rust, Maud, Axum, and HTMX." }

            button hx-get="/alternate_message" hx-swap="outerHTML" {
                "Click me to load content with HTMX"
            }
        }
    };

    Html(markup.into_string())
}

async fn alternate_message() -> Html<String> {
    let markup = html! {
        button hx-get="/" hx-swap="outerHTML" {
            "Alternate message!"
        }
    };
    Html(markup.into_string())
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(root))
        .route("/alternate_message", get(alternate_message))
        .nest_service("/include/htmx.min.js", ServeFile::new("./include/htmx.min.js"));

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();
    println!("listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}
