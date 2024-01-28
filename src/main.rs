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
                script src="/static/script.min.js" {}
            }
        }
    };

    Html(markup.into_string())
}

macro_rules! serve_static_file {
    ($func_name:ident, $path:expr, $content_type:expr) => {
        async fn $func_name() -> impl IntoResponse {
            let content = include_bytes!($path);
            let body = Body::from(content.as_ref());
            let mut response = Response::new(body);
            response.headers_mut().insert(
                axum::http::header::CONTENT_TYPE,
                HeaderValue::from_static($content_type),
            );
            response
        }
    };
}

serve_static_file!(
    serve_script,
    "../static/script.min.js",
    "application/javascript"
);
serve_static_file!(serve_font, "../static/Geologica-Regular.ttf", "font/ttf");
serve_static_file!(serve_favicon, "../static/favicon.ico", "image/ico");

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(root))
        .route("/favicon.ico", get(serve_favicon))
        .route("/static/script.min.js", get(serve_script))
        .route("/static/Geologica-Regular.ttf", get(serve_font));

    let listener = TcpListener::bind("127.0.0.1:3000").await.unwrap();
    println!("Listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}
