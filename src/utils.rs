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
