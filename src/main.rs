use axum::{
    body::Body,
    http::{HeaderValue, Response},
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use maud::{html, DOCTYPE};
use tokio::net::TcpListener;

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

async fn script_js() -> impl IntoResponse {
    let content = include_str!("../static/script.js");
    let body = Body::from(content);
    let mut response = Response::new(body);
    response.headers_mut().insert(
        axum::http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/javascript"),
    );
    response
}

async fn geologica_regular_ttf() -> impl IntoResponse {
    let content = include_bytes!("../static/Geologica-Regular.ttf");
    let body = Body::from(content.as_ref());
    let mut response = Response::new(body);
    response.headers_mut().insert(
        axum::http::header::CONTENT_TYPE,
        HeaderValue::from_static("font/ttf"),
    );
    response
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(root))
        .route("/static/script.js", get(script_js))
        .route("/static/Geologica-Regular.ttf", get(geologica_regular_ttf));

    let listener = TcpListener::bind("127.0.0.1:3000").await.unwrap();
    println!("Listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}
