# -*- coding: utf-8 -*-
from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class NetcardTemplate(models.Model):
    """قالب بطاقة شبكة — مدمج (template1…) أو مرفوع من الموظف."""

    _name = "netcard.template"
    _description = "Netcard Template"
    _order = "sequence, code"

    name = fields.Char(string="اسم القالب", required=True, translate=True)
    code = fields.Char(
        string="رمز القالب",
        required=True,
        index=True,
        help="مثل template1 أو custom-173… — يُطابق تطبيق React.",
    )
    sequence = fields.Integer(default=10)
    active = fields.Boolean(default=True)
    is_builtin = fields.Boolean(
        string="قالب محفظة جيب",
        default=False,
        help="قوالب JPG الـ 17 الافتراضية.",
    )
    featured = fields.Boolean(string="مميز", default=False)
    image = fields.Image(
        string="صورة القالب",
        max_width=4096,
        max_height=4096,
        attachment=True,
    )
    image_filename = fields.Char(string="اسم الملف")
    layout_id = fields.Many2one(
        "netcard.template.layout",
        string="تخطيط الليبلات",
        ondelete="set null",
        copy=False,
    )
    layout_layer_count = fields.Integer(
        string="عدد الطبقات",
        compute="_compute_layout_layer_count",
        store=False,
    )
    company_id = fields.Many2one(
        "res.company",
        string="الشركة",
        default=lambda self: self.env.company,
        index=True,
    )

    _sql_constraints = [
        (
            "netcard_template_code_company_uniq",
            "unique(code, company_id)",
            "رمز القالب يجب أن يكون فريداً لكل شركة.",
        ),
    ]

    @api.depends("layout_id", "layout_id.layers_json")
    def _compute_layout_layer_count(self):
        for rec in self:
            layers = rec.layout_id.layers_json if rec.layout_id else []
            rec.layout_layer_count = len(layers) if isinstance(layers, list) else 0

    @api.constrains("code")
    def _check_code(self):
        for rec in self:
            if not rec.code or not rec.code.strip():
                raise ValidationError(_("رمز القالب مطلوب."))

    def action_open_layout(self):
        self.ensure_one()
        if not self.layout_id:
            self.layout_id = self.env["netcard.template.layout"].create(
                {
                    "name": self.name,
                    "template_id": self.id,
                    "layers_json": [],
                }
            )
        return {
            "type": "ir.actions.act_window",
            "name": _("تخطيط الليبلات"),
            "res_model": "netcard.template.layout",
            "res_id": self.layout_id.id,
            "view_mode": "form",
            "target": "current",
        }
