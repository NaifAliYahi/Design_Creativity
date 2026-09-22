# مرجع Models — Odoo 19 Community (نسخ للذكاء الاصطناعي)

## netcard.template
| Field | Type | Notes |
|-------|------|-------|
| name | Char | اسم عربي |
| code | Char | template1 … unique/company |
| sequence | Integer | ترتيب |
| is_builtin | Boolean | القوالب الـ 17 |
| featured | Boolean | |
| image | Image | JPG/PNG |
| layout_id | Many2one → netcard.template.layout | |
| company_id | Many2one res.company | |

## netcard.template.layout
| Field | Type | Notes |
|-------|------|-------|
| template_id | Many2one netcard.template | قالب مدمج |
| custom_template_id | Many2one netcard.custom.template | قالب مستورد |
| template_code | Char computed | |
| layers_json | Json | = DesignLayer[] من React |
| layers_text | Text computed/inverse | استيراد bundled-layouts |
| background_url | Char | |
| version | Integer | |
| last_editor_id | Many2one res.users | |

### DesignLayer (JSON element)
```json
{
  "id": "string",
  "type": "name|code|phone|image",
  "x": 0, "y": 0,
  "fontSize": 52,
  "color": "#000000",
  "fontFamily": "Cairo",
  "fontWeight": "700",
  "textAlign": "center",
  "rotation": 0,
  "opacity": 1,
  "visible": true,
  "shadowOn": true,
  "width": 120, "height": 120,
  "imageSrc": null
}
```

## netcard.custom.template
| Field | Type |
|-------|------|
| name | Char |
| image | Image |
| thumb | Image |
| partner_id | Many2one res.partner |
| user_id | Many2one res.users |
| session_key | Char |
| layout_id | Many2one layout |

## netcard.export.log
| Field | Type |
|-------|------|
| network_name, network_code, phone | Char |
| template_id / custom_template_id | Many2one |
| source | Selection public_design / studio / api |
| user_id, partner_id, company_id | |

## Groups
- `jaib_netcard.group_netcard_user` — موظف
- `jaib_netcard.group_netcard_manager` — مدير
- `base.group_public` — قراءة قوالب+layouts للرابط /design
