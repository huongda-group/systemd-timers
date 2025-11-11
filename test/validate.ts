// 1. Định dạng cơ bản hợp lệ
// "2024-12-25 14:30:00"
// "*-*-* 00:00:00"                    # Mỗi ngày 00:00
// "*-*-* *:*:00"                      # Mỗi phút
// "Mon *-*-* 09:00:00"                # Thứ 2 hàng tuần 9AM
// "*-*-15 10:00:00"                   # Ngày 15 hàng tháng
// 2. Định dạng viết tắt
// "daily"                             # Hàng ngày 00:00
// "hourly"                            # Đầu mỗi giờ
// "monthly"                           # Ngày 1 hàng tháng 00:00
// "weekly"                            # Thứ 2 hàng tuần 00:00
// "yearly"                            # Ngày 1 tháng 1 hàng năm
// "annually"                          # Tương tự yearly
// "*-*-* 02:00"                       # Không cần seconds
// "12:00"                             # Chỉ thời gian
// 3. Multiple times
// "Mon,Fri *-*-* 10:00:00"            # Thứ 2 và thứ 6
// "Mon..Fri *-*-* 09:00:00"           # Thứ 2 đến thứ 6
// "*-*-1,15 *:00:00"                  # Ngày 1 và 15 mỗi giờ
// "09:00,15:00,21:00"                 # Nhiều thời điểm
// "Sat,Sun 20:00:00"                  # Cuối tuần
// 4. Khoảng thời gian
// "*-*-* 9..17:00:00"                 # 9AM đến 5PM mỗi giờ
// "*-*-* 0..6:30:00"                  # 12AM-6:30AM mỗi 30 phút
// "*-07-* 00..04:00:00"               # Tháng 7, 12AM-4AM
// 5. Kết hợp phức tạp
// "Mon *-8-1 09:00:00"                # Thứ 2 ngày 1 tháng 8
// "*-*-1 00:00:00"                    # Ngày đầu tháng
// "*-12-25 00:00:00"                  # Giáng sinh
// "Mon *-*-1..7 09:00:00"             # Thứ 2 tuần đầu tháng
// 6. Edge cases
// "*-2-29 00:00:00"                   # Ngày 29 tháng 2 (nhuận)
// "*-*-* 00:00:00 UTC"                # Với timezone
// "*-*-* 00:00:00 America/New_York"   # Timezone cụ thể
// "2024-12-25 14:30:00 Europe/Paris"  # Ngày cụ thể + timezone
// 7. Multiple rules
// "Mon *-*-* 10:00:00\nFri *-*-* 15:00:00"  # Nhiều rules
// "daily\nweekly"                     # Multiple shortcuts
// 8. Whitespace variations
// "*-*-* 00:00:00"                    # Normal
// " *-*-* 00:00:00 "                  # Có space
// "*-*-*  00:00:00"                   # Multiple spaces
// "Mon, Fri *-*-* 09:00:00"           # Space sau comma
// 9. Special values
// "*-*-* *:00/15:00"                  # Mỗi 15 phút
// "*-*-* *:*/10:00"                   # Mỗi 10 phút
// "*:*:00"                            # Mỗi giây? (cần check)
// "today 14:00:00"                    # Today keyword
// "now + 1h"                          # Relative time

// Syntax sai:
// "*-*-* 25:00:00"                    # Giờ không hợp lệ
// "*-*-* 00:60:00"                    # Phút không hợp lệ
// "*-13-* 00:00:00"                   # Tháng không hợp lệ
// "*-*-32 00:00:00"                   # Ngày không hợp lệ
// "Something *-*-* 00:00:00"          # Weekday sai
// Format sai:
// "2024/12/25 14:30:00"               # Separator sai
// "14:30"                             # Thiếu seconds trong full format
// "*-*-* *:*"                         # Thiếu seconds
// "Mon,-*-* 09:00:00"                 # Syntax sai
// "Mon.. 09:00:00"                    # Range không đầy đủ
// Giá trị ngoài range:
// "*-*-* 24:00:00"                    # Giờ = 24
// "*-*-* 00:00:60"                    # Giây = 60
// "*-*-0 00:00:00"                    # Ngày = 0
// "*-0-* 00:00:00"                    # Tháng = 0
// Missing components:
// "*-*-* "                            # Thiếu thời gian
// "14:30:00 *-*-*"                    # Thời gian và ngày bị đảo ngược
// ""                                  # String rỗng
// "   "                               # Chỉ có khoảng trắng

