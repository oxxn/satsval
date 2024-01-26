use minify_js::{minify, Session, TopLevelMode};
use std::fs;
use std::io::Write;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Specify the path to the JavaScript file and its minified version
    let js_file = "./static/script.js";
    let minified_js_file = "./static/script.min.js";

    // Read the JavaScript file
    let code = fs::read(js_file)?;

    // Create a minification session
    let session = Session::new();

    // Minify the JavaScript
    let mut out = Vec::new();
    minify(&session, TopLevelMode::Global, &code, &mut out).unwrap();

    // Write the minified JavaScript to a new file
    let mut file = fs::File::create(minified_js_file)?;
    file.write_all(&out)?;

    Ok(())
}
