use axum::{response::Html, routing::get, Router};
use maud::{html, DOCTYPE};
use tower_http::services::ServeFile;

async fn root() -> Html<String> {
    let markup = html! {
        (DOCTYPE)
        html lang="en" {
            head {
                meta charset="UTF-8" {}
                meta name="viewport" content="width=device-width, initial-scale=1.0" {}
                title { "SATSVAL" }
                style { r#"
                    @font-face {
                        font-family: 'Geologica';
                        src: url('/static/Geologica-Regular.ttf') format('truetype');
                        font-weight: normal;
                        font-style: normal;
                    }
                    body, html {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                    }
                    #canvas {
                        background-color: #222222;
                        display: block;
                    }
                "# }
            }
            body {
                canvas id="canvas" {}
                script src="/static/script.js" {}
            }
        }
    };

    Html(markup.into_string())
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(root))
        .nest_service("/static/script.js", ServeFile::new("./static/script.js"))
        .nest_service(
            "/static/Geologica-Regular.ttf",
            ServeFile::new("./static/Geologica-Regular.ttf"),
        );

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();
    println!("Listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}
